from fastapi.responses import JSONResponse
from fastapi import Request
import datetime
import requests
import traceback
from utils.constants import ENVIRONMENT, LATEST_COMMIT_ID, DB_FUNCTION_INVOCATIONS
from database.users import UserGateway
from database.db import DynamoDBGateway


async def verify_login(request: Request, call_next):
    if request.method == 'OPTIONS':
        return await call_next(request)

    if ENVIRONMENT != 'production':
        print("Not in production, bypassing verify login")
        return await call_next(request)

    if request.url.path == '/send-instructions-email':
        print("Sending instructions email, bypassing verify login")
        return await call_next(request)

    if request.url.path == '/guest-login':
        print("Logging in as guest, bypassing verify login")
        return await call_next(request)

    auth_header: str = request.headers.get('Authorization', request.headers.get('authorization', None))
    if auth_header is None:
        # todo: you should know if whether this failed
        return JSONResponse(status_code=401, content={"message": "Missing Authorization header"})

    if _verify_token_in_discord(auth_header):
        print("Discord successfully verified token")
        return await call_next(request)

    email = request.headers.get('Email', None)
    user_gateway = UserGateway() # initialize UserGateway just once
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

    return JSONResponse(status_code=401,content={"message": "Unauthorized user. If you're logged in as guest, this means you're out of trial requests"})


async def set_body(request: Request, body: bytes):
    async def receive():
        return {"type": "http.request", "body": body}

    request._receive = receive


async def get_body(request: Request) -> bytes:
    body = await request.json()
    return body


async def write_all_errors_to_dynamo(request: Request, call_next):
    start = datetime.datetime.now()
    await set_body(request, await request.body())
    # fast api request.body or .json will hang: https://github.com/tiangolo/fastapi/issues/394#issuecomment-883524819
    body = await get_body(request) if request.headers.get('Content-Type') == 'application/json' else {}

    email = body.get('email', request.headers.get('Email', None))
    question = body.get('question', None)

    try:
        response = await call_next(request)
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

def _verify_token_in_discord(bearer_token: str):
    try:
        response = requests.get(
            "https://discord.com/api/users/@me",
            headers={'Authorization': bearer_token},
            allow_redirects=True)
        return response.status_code // 100 == 2
    except Exception as e:
        print(f'fail verifying discord token: {e}')
        return False
