import datetime
import json
import os
import signal
import time
import traceback
import uuid
from typing import Union

import requests
from database.db import DynamoDBGateway
from database.users import (DiscordUsersGateway, GuestUsersGateway,
                            UserDoesNotExistException)
from fastapi import BackgroundTasks, Request
from fastapi.responses import JSONResponse
from utils.constants import (CONTENT_ENDPOINTS, DB_FUNCTION_INVOCATIONS,
                             DISCORD_WHITELIST_ROLENAME, ENVIRONMENT,
                             HIPPOAI_DISCORD_SERVER_ID, LATEST_COMMIT_ID,
                             UNAUTHENTICATED_ENDPOINTS)


async def set_body(request: Request, body: bytes):
    async def receive():
        return {"type": "http.request", "body": body}

    request._receive = receive


async def get_body(request: Request) -> bytes:
    # fast api request.body or .json will hang: https://github.com/tiangolo/fastapi/issues/394#issuecomment-883524819
    await set_body(request, await request.body())
    body = await request.json() if request.headers.get('Content-Type') == 'application/json' else {}
    return body


async def get_id_and_email_from_token(auth_header: str):
    response = requests.get(
        "https://discord.com/api/users/@me",
        headers={'Authorization': auth_header},
        allow_redirects=True)
    if response.status_code // 100 == 2:
        print(response.json())
        return {'id': response.json()['id'], 'email': response.json()['email']}
    else:
        print(f"Failed to get discord id from token: {auth_header}")
        return None


async def verify_discord_login(auth_header: Union[str,  None]):
    if auth_header is None: return None
    discord_object = await get_id_and_email_from_token(auth_header)
    
    if discord_object is not None:
        user_discord_id, discord_email = discord_object['id'], discord_object['email']
        discord_users_gateway = DiscordUsersGateway()
        try:
            user = discord_users_gateway.get_user_by_email(discord_email)
        except UserDoesNotExistException as e:
            # todo: should we really be creating the user here?
            user = discord_users_gateway.create_user(
                discord_email, user_discord_id, created_at=str(datetime.datetime.utcnow()))

        return user.discord_id



async def verify_login(request: Request, call_next):
    auth_header = request.headers.get('Authorization', None)
    email = request.headers.get('Email', None)

    if request.method == 'OPTIONS':
        return await call_next(request)

    if (auth_header == f"Bearer {os.environ['ASK_PAPER_BYPASS_AUTH_TOKEN']}"):
        print("Bypassing auth")
        request.state.user_discord_id = "258012200847802369" # walex id
        return await call_next(request)

    if request.url.path in UNAUTHENTICATED_ENDPOINTS:
        print("Endpoint is unaunthenticated, bypassing verify login")
        return await call_next(request)

    if auth_header is None and email is None:
        return JSONResponse(status_code=401, content={"message": "Unauthorized. Missing Auth or Email Header"})

    user_discord_id = await verify_discord_login(auth_header)

    if user_discord_id is not None:
        request.state.user_discord_id = user_discord_id
        print("Discord login verified")
        return await call_next(request)

    if email is None:
        return JSONResponse(status_code=401, content={"message": "Unauthorized. Missing Email Header"})
    
    guest_users_gateway = GuestUsersGateway()
    try:
        if (guest_users_gateway.has_remaining_requests(email)):
            print("Guest user verified")
            response = await call_next(request)
        
            if request.url.path in CONTENT_ENDPOINTS and response.status_code // 100 == 2: 
                # TODO, the following logic isn't the best way due to following reasons:
                # 1. if the user has very low latency, his browser might make several
                #    requests to ask at once, then he ends up only getting one response or none
                guest_users_gateway.decrement_remaining_trial_requests(email)

            return response
        else: 
            return JSONResponse(status_code=401, content={"message": "You're out of trial requests. Join us in discord for full access."})
    except UserDoesNotExistException as e:
        guest_users_gateway.create_user(email)

    return await call_next(request)
        

async def log_function_invocation_to_dynamo(request: Request, call_next):
    start = datetime.datetime.utcnow()
    body = await get_body(request)

    email = body.get('email', request.headers.get('Email', None))

    try:
        response = await call_next(request)
        time_elapsed = str(datetime.datetime.utcnow() - start)
        print(f"Elapsed time for {request.url.path}: {time_elapsed}")
        if response.background is None:
            background_tasks = BackgroundTasks()
        else:
            background_tasks = response.background

        background_tasks.add_task(DynamoDBGateway(DB_FUNCTION_INVOCATIONS).write, {
            'id': str(uuid.uuid4()),
            'email': email,
            'latest_commit_id': LATEST_COMMIT_ID,
            'function_path': request.url.path,
            'request_body': json.dumps(body),
            'time_elapsed': time_elapsed,
        })
        response.background = background_tasks
        return response
    except Exception as e:
        print("Caught by middleware")
        print(e)
        print(traceback.format_exc())
        DynamoDBGateway(DB_FUNCTION_INVOCATIONS).write({
            'id': str(uuid.uuid4()),
            'email': email,
            'latest_commit_id': LATEST_COMMIT_ID,
            'function_path': request.url.path,
            'request_body': json.dumps(body),
            'error': str(e),
            'traceback': traceback.format_exc(),
        })
        return JSONResponse(status_code=500, content="Internal Server Error: \n" + str(e))
