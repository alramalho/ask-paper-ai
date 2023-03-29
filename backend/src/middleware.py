from fastapi.responses import JSONResponse
from fastapi import Request, BackgroundTasks
import datetime
import requests
import traceback
from utils.constants import LATEST_COMMIT_ID, DB_FUNCTION_INVOCATIONS, DISCORD_WHITELIST_ROLENAME, HIPPOAI_DISCORD_SERVER_ID, DISCORD_CLIENT_BOT_TOKEN
from database.users import GuestUsersGateway, DiscordUsersGateway, UserDoesNotExistException
from database.db import DynamoDBGateway
import json
import uuid

async def set_body(request: Request, body: bytes):
    async def receive():
        return {"type": "http.request", "body": body}

    request._receive = receive


async def get_body(request: Request) -> bytes:
    # fast api request.body or .json will hang: https://github.com/tiangolo/fastapi/issues/394#issuecomment-883524819
    await set_body(request, await request.body())
    body = await request.json() if request.headers.get('Content-Type') == 'application/json' else {}
    return body


async def get_id_from_token(bearer_token: str):
    response = requests.get(
        "https://discord.com/api/users/@me",
        headers={'Authorization': bearer_token},
        allow_redirects=True)
    if response.status_code // 100 == 2:
        return response.json()['id']
    else:
        print(f"Failed to get discord id from token: {response.status_code}")
        return None
    

async def verify_login(request: Request, call_next):
    if request.method == 'OPTIONS':
        return await call_next(request)

    if request.url.path == '/send-instructions-email':
        print("Sending instructions email, bypassing verify login")
        return await call_next(request)

    if request.url.path == '/send-answer-email':
        print("Sending answers email, bypassing verify login")
        return await call_next(request)

    if request.url.path == '/guest-login':
        print("Logging in as guest, bypassing verify login")
        return await call_next(request)

    if request.url.path == '/user-remaining-requests-count':
        return await call_next(request)

    body = await get_body(request) 
    email = body.get('email', request.headers.get('Email', None))

    auth_header = request.headers.get('Authorization', None)
    discord_users_gateway = DiscordUsersGateway()
    
    user_discord_id = await get_id_from_token(auth_header)
    if user_discord_id is not None:
        try:
            discord_users_gateway.get_user_by_email(email)
        except UserDoesNotExistException as e:
            # todo: should we really be creating the user here?
            discord_users_gateway.create_user(email, user_discord_id, created_at=str(datetime.datetime.now()))  
        return await call_next(request)

    guest_users_gateway = GuestUsersGateway()
    if guest_users_gateway.is_guest_user_allowed(email):
        print("User is an allowed guest")
        response = await call_next(request)

        if request.url.path in ['/ask', '/summarize', '/extract-datasets'] and response.status_code // 100 == 2: 
            # TODO, the following logic isn't the best way due to following reasons:
            # 1. if the user has very low latency, his browser might make several
            #    requests to ask at once, then he ends up only getting one response or none
            guest_users_gateway.decrement_remaining_trial_requests(email)
        return response

    return JSONResponse(status_code=401, content={"message": "Unauthorized user. If you're logged in as guest, this means you're out of trial requests"})



async def log_function_invocation_to_dynamo(request: Request, call_next):
    background_tasks = BackgroundTasks()
    start = datetime.datetime.now()
    body = await get_body(request) 

    email = body.get('email', request.headers.get('Email', None))

    try:
        response = await call_next(request)
        time_elapsed = str(datetime.datetime.now() - start)
        print(f"Elapsed time for {request.url.path}: {time_elapsed}")
        background_tasks.add_task(DynamoDBGateway(DB_FUNCTION_INVOCATIONS).write, {
            'id': str(uuid.uuid4()),
            'email': email,
            'latest_commit_id': LATEST_COMMIT_ID,
            'function_path': request.url.path,
            'request_body': json.dumps(body),
            'time_elapsed': time_elapsed,
        })
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
            'time_elapsed': str(datetime.datetime.now() - start)
        })
        return JSONResponse(status_code=500, content="Internal Server Error: \n" + str(e))
