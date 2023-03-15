from fastapi.responses import JSONResponse
from fastapi import Request
import datetime
import requests
import traceback
from constants import ENVIRONMENT, LATEST_COMMIT_ID, SNAKE_CASE_PREFIX
import users
import db
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

    auth_header = request.headers.get('Authorization', request.headers.get('authorization', None))
    if auth_header is None:
        # todo: you should know if whether this failed
        return JSONResponse(status_code=401, content={"message": "Missing Authorization header"})

    def verify_token_in_discord(bearer_token):
        try:
            response = requests.get(
                "https://discord.com/api/users/@me",
                headers={'Authorization': bearer_token},
                allow_redirects=True)
            return response.status_code // 100 == 2
        except Exception as e:
            print(e)
            return False


    if verify_token_in_discord(auth_header):
        print("Discord successfully verified token")
        return await call_next(request)
    else:
        email = request.headers.get('Email', None)

        if users.UserGateway().is_guest_user_allowed(email):
            print("User is an allowed guest")
            response = await call_next(request)

            if request.url.path == '/ask':
                users.UserGateway().decrement_remaining_trial_requests(email)

            return response
        else:
            return JSONResponse(status_code=401, content={"message": "Unauthorized user. If you're logged in as guest, this means you're out of trial requests"})


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
        db.DynamoDBGateway(f'{SNAKE_CASE_PREFIX}_function_invocations').write({
            'function_path': request.url.path,
            'error': str(e),
            'email': email,
            'question': question,
            'traceback': traceback.format_exc(),
            'latest_commit_id': LATEST_COMMIT_ID,
            'time_elapsed': str(datetime.datetime.now() - start)
        })
        return JSONResponse(status_code=500, content="Internal Server Error: \n" + str(e))
