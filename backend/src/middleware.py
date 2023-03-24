from fastapi.responses import JSONResponse
from fastapi import Request, BackgroundTasks
import datetime
import requests
import traceback
from utils.constants import LATEST_COMMIT_ID, DB_FUNCTION_INVOCATIONS, DISCORD_WHITELIST_ROLENAME, HIPPOAI_DISCORD_SERVER_ID, DISCORD_CLIENT_BOT_TOKEN
from database.users import UserGateway
from database.db import DynamoDBGateway
import discord
from discord.ext import commands
import json

intents = discord.Intents.default()
intents.guilds = True
intents.members = True
client = commands.Bot(intents=intents, command_prefix='!')

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

    email = request.headers.get('Email', None)

    if verify_user_in_discord_server_with_role(email, DISCORD_WHITELIST_ROLENAME):
        print(f"User in discord with role {DISCORD_WHITELIST_ROLENAME}")
        return await call_next(request)

    user_gateway = UserGateway()  # initialize UserGateway just once
    if user_gateway.is_guest_user_allowed(email):
        print("User is an allowed guest")
        response = await call_next(request)
        if request.url.path == '/ask':
            # TODO, the following logic isn't the best way due to following reasons:
            # 1. if the user has very low latency, his browser might make several
            #    requests to ask at once, then he ends up only getting one response or none
            # 2. if ask failed on the backend, we are counting as it was succeeded and
            #    decrements the token anyway
            user_gateway.decrement_remaining_trial_requests(email)
        return response

    return JSONResponse(status_code=401, content={"message": "Unauthorized user. If you're logged in as guest, this means you're out of trial requests"})


async def verify_user_in_discord_server_with_role(email: str, role_name: str):
    await client.login(DISCORD_CLIENT_BOT_TOKEN)
    await client.wait_until_ready()
    server = client.get_guild(HIPPOAI_DISCORD_SERVER_ID)

    if not server:
        print("Server not found.")
        return False

    role = discord.utils.get(server.roles, name=role_name)
    if not role:
        print("Role not found.")
        return False

    for member in server.members:
        if member.email == email and role in member.roles:
            return True


async def set_body(request: Request, body: bytes):
    async def receive():
        return {"type": "http.request", "body": body}

    request._receive = receive


async def get_body(request: Request) -> bytes:
    body = await request.json()
    return body


async def log_function_invocation_to_dynamo(request: Request, call_next):
    background_tasks = BackgroundTasks()
    start = datetime.datetime.now()
    await set_body(request, await request.body())
    # fast api request.body or .json will hang: https://github.com/tiangolo/fastapi/issues/394#issuecomment-883524819
    body = await get_body(request) if request.headers.get('Content-Type') == 'application/json' else {}

    email = body.get('email', request.headers.get('Email', None))

    try:
        response = await call_next(request)
        time_elapsed = str(datetime.datetime.now() - start)
        print(f"Elapsed time for {request.url.path}: {time_elapsed}")
        background_tasks.add_task(DynamoDBGateway(DB_FUNCTION_INVOCATIONS).write,
                                  {
                                   'email': email,
                                   'latest_commit_id': LATEST_COMMIT_ID,
                                   'time_elapsed': time_elapsed,
                                   'function_path': request.url.path,
                                   'request_body': json.dumps(body)
                                   })
        return response
    except Exception as e:
        print("Caught by middleware")
        print(e)
        print(traceback.format_exc())
        DynamoDBGateway(DB_FUNCTION_INVOCATIONS).write({
            'function_path': request.url.path,
            'error': str(e),
            'email': email,
            'question': question,
            'traceback': traceback.format_exc(),
            'latest_commit_id': LATEST_COMMIT_ID,
            'time_elapsed': str(datetime.datetime.now() - start)
        })
        return JSONResponse(status_code=500, content="Internal Server Error: \n" + str(e))
