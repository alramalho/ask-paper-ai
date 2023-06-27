import base64
import datetime
import json
import os
import os.path
import re
import time
import uuid
from functools import wraps
from typing import Dict, List, Tuple, Union

import aws
import middleware
import nlp
from botocore.exceptions import ClientError
from database.db import DynamoDBGateway
from database.users import (DiscordUsersGateway, GuestUsersGateway,
                            UserDoesNotExistException)
from doc2json.grobid2json.process_pdf import process_pdf_file
from fastapi import (BackgroundTasks, FastAPI, HTTPException, Request,
                     Response, UploadFile)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import parse_obj_as
from utils.constants import (ASK_PAPER_BANNER_IMG, DB_EMAILS_SENT, DB_FEEDBACK,
                             DB_JSON_PAPERS, EMAIL_SENDER, ENVIRONMENT,
                             FILESYSTEM_BASE)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.middleware("http")(middleware.verify_login)
app.middleware("http")(middleware.log_function_invocation_to_dynamo)
app.middleware("http")(middleware.shutdown_after_request)

def generate_hash(content: Union[str, bytes]):
    import hashlib
    if isinstance(content, str):
        content = content.encode()

    sha256 = hashlib.sha256()
    sha256.update(content)
    return sha256.hexdigest()


def get_paper_from_url(url: str) -> bytes:
    import requests
    response = requests.get(url)
    return response.content


def process_paper(pdf_file_content, pdf_file_name) -> dict:
    pdf_file_name = pdf_file_name.lower()
    pdf_file_name = pdf_file_name.replace(' ', '')
    output_location = f"{FILESYSTEM_BASE}/processing_output"
    if not os.path.exists(output_location):
        os.mkdir(output_location)
        print("created dir")
    with open(f"{output_location}/{pdf_file_name}", "wb") as f:
        f.write(pdf_file_content)
        print("created file")

    pdf_file_name = pdf_file_name.replace('.pdf', '')
    output_file = process_pdf_file(input_file=f'{output_location}/{pdf_file_name}.pdf',
                                   temp_dir=output_location, output_dir=output_location,
                                   grobid_config={
                                       'grobid_url': os.getenv('GROBID_URL', 'https://kermitt2-grobid.hf.space')})
    with open(os.path.abspath(output_file), 'r') as f:
        f = json.load(f)
    print(f['title'])

    if ENVIRONMENT != 'dev':
        os.remove(f"{output_location}/{pdf_file_name}.pdf")
        os.remove(f"{output_location}/{pdf_file_name}.tei.xml")
        os.remove(f"{output_location}/{pdf_file_name}.json")
        print("Removed files")

    return f


async def streamer():
    for i in range(10):
        time.sleep(1)
        yield b"This is streaming from Lambda \n"


@app.get("/test")
async def index():
    return StreamingResponse(streamer(), media_type="text/plain; charset=utf-8")


@app.get('/health')
async def health(request: Request):
    return {'status': 'ok'}


@app.post('/guest-login')
async def guest_login(request: Request, response: Response):
    user_email = request.headers.get('Email').lower()
    if user_email is None:
        raise HTTPException(status_code=400, detail="Missing email header")

    # if email is not valid return 400
    if not re.match(r"[^@]+@[^@]+\.[^@]+", user_email):
        raise HTTPException(status_code=400, detail="Invalid email")

    users_gateway = GuestUsersGateway()
    try:
        user = users_gateway.get_user_by_email(user_email)
    except UserDoesNotExistException:
        user = users_gateway.create_user(user_email)
        response.status_code = 201

    return {'remaining_trial_requests': user.remaining_trial_requests}


@app.get('/user-remaining-requests-count')
async def get_user_remaining_requests_count(request: Request):
    user_email = request.headers.get('Email')
    if user_email is None:
        raise HTTPException(
            status_code=400, detail="Missing email query param")

    users_gateway = GuestUsersGateway()
    try:
        user = users_gateway.get_user_by_email(user_email)
    except UserDoesNotExistException:
        raise HTTPException(status_code=404, detail="User not found")

    return {'remaining_trial_requests': user.remaining_trial_requests}


@app.post('/send-instructions-email')
async def send_instructions_email(request: Request, background_tasks: BackgroundTasks):
    body = await request.json()
    recipient = body['recipient']
    subject = 'Hippo AI 📝 How to start using Ask Paper'
    body_html = f"""
    <div style="max-width: 600px; margin: 0 auto; background: #f4f4f4; padding: 1rem; border: 1px solid #cacaca; border-radius: 15px">
        <img src="{ASK_PAPER_BANNER_IMG}" width="100%"/>
        <br/>
        <br/>
        <br/>
        <h2>How to use Ask Paper</h2>
        <ul style="list-style: none">
            <li>1️⃣. First, if you don't have already, you need to create a Discord account. <a href="https://discord.com/register?redirect_to=https://askpaper.ai">Click here to register</a></li>
            <li>2️⃣. Next, you need to join the Ask Paper Discord server. <a href="https://discord.gg/6zugVKk2sd">Click here to join</a></li>
            <li>3️⃣. Once you have joined the server, you can use the <a href="https://askpaper.ai">web app</a> normally to ask questions about the paper you uploaded.</li>
        </ul>
        <h2>If you have any questions, just reply to this email.</h2>
        </div>
    """
    try:
        response = aws.ses_send_email(
            recipient, subject, body_html, EMAIL_SENDER)
        background_tasks.add_task(DynamoDBGateway(DB_EMAILS_SENT).write, {
            'id': str(uuid.uuid4()),
            'recipient': recipient,
            'subject': subject,
            'body_html': body_html,
            'sender': EMAIL_SENDER,
            'type': 'instructions',
            'sent_at': str(datetime.datetime.utcnow())
        })
    except ClientError as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to send email: {e.response['Error']['Message']}")
    print(response)
    return {'message': f"Email sent! Message ID: {response['MessageId']}"}


@app.post('/send-answer-email')
async def send_answer_email(request: Request, background_tasks: BackgroundTasks):
    data = await request.json()
    recipient = data['recipient']
    subject = f'Ask Paper 📝 Regarding your question on "{data["paper_title"]}"'
    body_html = f"""
    <div style="max-width: 600px; margin: 0 auto; background: #f4f4f4; padding: 1rem; border: 1px solid #cacaca; border-radius: 15px">
        <img src="{ASK_PAPER_BANNER_IMG}" width="100%"/>
        <br/>
        <br/>
        <br/>
        <h2>Your question on "<i>{data['paper_title']}</i>"</h2>
        <p>{data['question']}</p>
        <h2>The answer</h2>
        <p>{data['answer']}</p>
        <h2>If you have any questions, just reply to this email.</h2>
        </div>
    """
    try:

        response = aws.ses_send_email(
            recipient, subject, body_html, EMAIL_SENDER)
        background_tasks.add_task(DynamoDBGateway(DB_EMAILS_SENT).write, {
            'id': str(uuid.uuid4()),
            'recipient': recipient,
            'subject': subject,
            'body_html': body_html,
            'sender': EMAIL_SENDER,
            'type': 'answer',
            'sent_at': str(datetime.datetime.utcnow())
        })
    except ClientError as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to send email: {e.response['Error']['Message']}")
    print(response)
    return {'message': f"Email sent! Message ID: {response['MessageId']}"}


@app.post("/upload-paper")
async def upload_paper(pdf_file: UploadFile, request: Request, response: Response, background_tasks: BackgroundTasks):

    try:
        email = request.headers['Email']
        accept = request.headers['Accept']
    except KeyError as e:
        raise HTTPException(status_code=400, detail="Missing data: " + str(e))

    pdf_file_name = pdf_file.filename
    pdf_file_content = await pdf_file.read()
    print(f"Upload paper {pdf_file_name}")

    paper_hash = generate_hash(pdf_file_content)

    existing_paper = DynamoDBGateway(DB_JSON_PAPERS).read('id', paper_hash)
    if existing_paper is None:
        print("Creating new paper in S3 and DynamoDB")
        json_paper = process_paper(pdf_file_content, pdf_file_name)
        aws.store_paper_in_s3(pdf_file_content, f"{paper_hash}.pdf")

        def safe_write():
            try:
                DynamoDBGateway(DB_JSON_PAPERS).write({
                    'id': paper_hash,
                    'paper_title': json_paper['title'],
                    'paper_json': json.dumps(json_paper),
                    'email': email,
                })
            except ClientError as e:
                print(
                    f"ERROR: Failed to write paper to Dynamo: {e.response['Error']['Message']}")

        background_tasks.add_task(safe_write)
    else:
        json_paper = json.loads(existing_paper['paper_json'])

    json_paper['hash'] = paper_hash

    if accept == 'text/plain':
        response.headers["Content-Type"] = "text/plain"
        return nlp.Paper(**json_paper).to_text()
    else:
        return json_paper


@app.post("/save-datasets")
async def save_datasets(request: Request):
    data = await request.json()
    try:
        datasets = json.loads(data['datasets'])
        # todo: this is unused. only for analytics purposes
        changes = json.loads(data['changes'])
        if hasattr(request.state, 'user_discord_id'):
            user_discord_id = request.state.user_discord_id
            print(f"User discord id: {user_discord_id}")
            if user_discord_id is not None:
                DiscordUsersGateway().override_user_datasets(
                    request.state.user_discord_id, datasets)
        else:
            raise HTTPException(
                status_code=401, detail="Discord Auth failed, please contact support")
        return {'message': "done"}
    except KeyError as e:
        raise HTTPException(status_code=400, detail="Missing data: " + str(e))


@app.put("/update-datasets")
async def update_datasets(request: Request):
    data = await request.json()
    try:
        paper_title = data["paper_title"]
        datasets = json.loads(data['datasets'])
        for dataset in datasets:
            dataset['Found In'] = paper_title

        if hasattr(request.state, 'user_discord_id'):
            user_discord_id = request.state.user_discord_id
            print(f"User discord id: {user_discord_id}")
            if user_discord_id is not None:
                DiscordUsersGateway().update_user_datasets(
                    request.state.user_discord_id, datasets)
        else:
            raise HTTPException(
                status_code=401, detail="Discord Auth failed, please contact support")

        return {'message': "done"}
    except KeyError as e:
        raise HTTPException(status_code=400, detail="Missing data: " + str(e))


@app.get('/get-datasets')
async def user_datasets(request: Request):
    user_discord_id = request.state.user_discord_id

    users_gateway = DiscordUsersGateway()
    try:
        user = users_gateway.get_user_by_id(user_discord_id)
    except UserDoesNotExistException:
        raise HTTPException(status_code=404, detail="User not found")

    return {'datasets': json.dumps(user.datasets)}


@app.post("/ask-paper")
async def ask_paper(request: Request):
    data = await request.json()
    try:
        question = data['question']
        history = parse_obj_as(
            List[nlp.ChatMessage], json.loads(data.get('history', '[]')))
        paper = nlp.Paper(**json.loads(data['paper']))

    except KeyError as e:
        raise HTTPException(status_code=400, detail="Missing data: " + str(e))

    return StreamingResponse(content=nlp.ask_paper(question=question, message_history=history, paper=paper), media_type="text/plain")


@app.post("/ask-context")
async def ask_context(request: Request):
    data = await request.json()
    try:
        question = data['question']
        history = parse_obj_as(
            List[nlp.ChatMessage], json.loads(data.get('history', '[]')))
        context = data['context']

    except KeyError as e:
        raise HTTPException(status_code=400, detail="Missing data: " + str(e))

    return StreamingResponse(content=nlp.ask_context(question, context, history), media_type="text/plain")


@app.post("/store-feedback")
async def store_feedback(request: Request):
    body = await request.json()

    if 'table_name' not in body:
        raise HTTPException(status_code=400, detail="Missing table_name")
    if 'data' not in body:
        raise HTTPException(status_code=400, detail="Missing data: " + str(e))

    body['data']['id'] = str(uuid.uuid4())

    # todo: are there security concers here?
    DynamoDBGateway(DB_FEEDBACK).write(body['data'])

    return {"message": "success"}


if __name__ == "__main__":
    import asyncio

    from hypercorn.asyncio import serve
    from hypercorn.config import Config
    asyncio.run(serve(app, Config()))
    # trying out hypercorn instead of uvicorn – https://github.com/encode/httpx/issues/96
