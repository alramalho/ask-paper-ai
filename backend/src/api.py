import datetime
import os.path
import uuid

from fastapi import FastAPI, Request, UploadFile, HTTPException, BackgroundTasks, Response
from fastapi.middleware.cors import CORSMiddleware

from doc2json.grobid2json.process_pdf import process_pdf_file
import os
import json
from mangum import Mangum
from utils.constants import (
    LATEST_COMMIT_ID, FILESYSTEM_BASE, ENVIRONMENT, EMAIL_SENDER, ASK_PAPER_BANNER_IMG,
    DB_FUNCTION_INVOCATIONS, DB_EMAILS_SENT, DB_JSON_PAPERS, DB_FEEDBACK
)
import aws
import middleware
from botocore.exceptions import ClientError
import nlp
from database.db  import DynamoDBGateway
from database.users import UserGateway, UserDoesNotExistException
import re


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.middleware("http")(middleware.verify_login)
app.middleware("http")(middleware.write_all_errors_to_dynamo)

handler = Mangum(app)


def generate_hash(content: str):
    import hashlib
    sha256 = hashlib.sha256()
    sha256.update(content.encode())
    return sha256.hexdigest()


def process_paper(pdf_file_content, pdf_file_name) -> dict:
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

    if ENVIRONMENT == 'production' or ENVIRONMENT == 'sandbox':
        os.remove(f"{output_location}/{pdf_file_name}.pdf")
        os.remove(f"{output_location}/{pdf_file_name}.tei.xml")
        os.remove(f"{output_location}/{pdf_file_name}.json")
        print("Removed files")

    return f

@app.post('/guest-login')
async def guest_login(request: Request, response: Response):
    user_email = request.headers.get('Email').lower()
    if user_email is None:
        raise HTTPException(status_code=400, detail="Missing email header")

    # if email is not valid return 400
    if not re.match(r"[^@]+@[^@]+\.[^@]+", user_email):
        raise HTTPException(status_code=400, detail="Invalid email")

    users_gateway = UserGateway()
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
        raise HTTPException(status_code=400, detail="Missing email query param")

    users_gateway = UserGateway()
    try:
        user = users_gateway.get_user_by_email(user_email)
    except UserDoesNotExistException:
        raise HTTPException(status_code=404, detail="User not found")

    return {'remaining_trial_requests': user.remaining_trial_requests}

@app.post('/send-instructions-email')
async def send_instructions_email(request: Request, background_tasks: BackgroundTasks):
    body = await request.json()
    recipient = body['recipient']
    subject ='Hippo AI 📝 How to start using Ask Paper'
    body_html = f"""
    <div style="max-width: 600px; margin: 0 auto; background: #f4f4f4; padding: 1rem; border: 1px solid #cacaca; border-radius: 15px">
        <img src="{ASK_PAPER_BANNER_IMG}" width="100%"/>
        <br/>
        <br/>
        <br/>
        <h2>How to use Ask Paper</h2>
        <ul style="list-style: none">
            <li>1️⃣. First, you need to create a Discord account. <a href="https://discord.com/register?redirect_to=https://askpaper.ai">Click here to register</a></li>
            <li>2️⃣. Next, you need to join the Ask Paper Discord server. <a href="https://discord.gg/6zugVKk2sd">Click here to join</a></li>
            <li>3️⃣. Once you have joined the server, you can use the <a href="https://askpaper.ai">web app</a> normally to ask questions about the paper you uploaded.</li>
        </ul>
        <h2>If you have any questions, just reply to this email.</h2>
        </div>
    """
    try:
        response = aws.ses_send_email(recipient, subject, body_html, EMAIL_SENDER)
        background_tasks.add_task(DynamoDBGateway(DB_EMAILS_SENT).write, {
            'recipient': recipient,
            'subject': subject,
            'body_html': body_html,
            'sender': EMAIL_SENDER,
            'type': 'instructions',
            'sent_at': str(datetime.datetime.now())
        })
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {e.response['Error']['Message']}")
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
        <h2>Your question on {data['paper_title']}</h2>
        <p>{data['question']}</p>
        <h2>The answer</h2>
        <p>{data['answer']}</p>
        <h2>If you have any questions, just reply to this email.</h2>
        </div>
    """
    try:
        response = aws.ses_send_email(recipient, subject, body_html, EMAIL_SENDER)
        background_tasks.add_task(DynamoDBGateway(DB_EMAILS_SENT).write, {
            'recipient': recipient,
            'subject': subject,
            'body_html': body_html,
            'sender': EMAIL_SENDER,
            'type': 'answer',
            'sent_at': str(datetime.datetime.now())
        })
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {e.response['Error']['Message']}")
    print(response)
    return {'message': f"Email sent! Message ID: {response['MessageId']}"}


@app.post("/upload-paper")
async def upload_paper(pdf_file: UploadFile, request: Request, background_tasks: BackgroundTasks):
    start = datetime.datetime.now()
    email = request.headers.get('Email', None)
    pdf_file_name = pdf_file.filename
    pdf_file_content = await pdf_file.read()
    print(f"Upload paper {pdf_file_name}")

    json_paper = process_paper(pdf_file_content, pdf_file_name)

    abstract = json_paper.get('pdf_parsed', {}).get('abstract')

    paper_hash = generate_hash(abstract) if abstract is not None else str(uuid.uuid4())

    DynamoDBGateway(DB_JSON_PAPERS).write({
        'id': paper_hash,
        'paper_title': json_paper['title'],
        'paper_json': json.dumps(json_paper),
        'email': email,
    })

    time_elapsed = datetime.datetime.now() - start

    background_tasks.add_task(DynamoDBGateway(DB_FUNCTION_INVOCATIONS).write,
                              {'function_path': request.url.path,
                               'time_elapsed': str(time_elapsed),
                               'email': email,
                               'paper_hash': paper_hash})
    background_tasks.add_task(aws.store_paper_in_s3, pdf_file_content, f"{paper_hash}.pdf")

    json_paper['id'] = paper_hash

    return json_paper


@app.post("/ask")
async def ask(request: Request, background_tasks: BackgroundTasks):
    start = datetime.datetime.now()
    data = await request.json()
    if "question" in data and "quote" in data and "context" in data and 'email' in request.headers:
        question = data["question"]
        quote = data["quote"]
        email = request.headers.get("email")
        context = data['context']
        contexts = nlp.split_text(data['context'])

        if quote:
            question += "Please include at least one quote from the original paper."

        response = await nlp.ask_llm(question, context)

        time_elapsed = datetime.datetime.now() - start
        token_length_estimate: int = nlp.count_tokens(context) + nlp.count_tokens(question) + 100
        background_tasks.add_task(DynamoDBGateway(DB_FUNCTION_INVOCATIONS).write,
                                  {'function_path': request.url.path,
                                   'email': email,
                                   'latest_commit_id': LATEST_COMMIT_ID,
                                   'time_elapsed': str(time_elapsed),
                                   'question': question,
                                   'was_prompt_cut': len(contexts) > 1,
                                   'prompt_token_length_estimate': token_length_estimate,
                                   'response_text': response})
        return {'message': response}
    else:
        raise HTTPException(status_code=400, detail="Missing data")


@app.post("/store-feedback")
async def store_feedback(request: Request):
    body = await request.json()

    if 'table_name' not in body:
        raise HTTPException(status_code=400, detail="Missing table_name")
    if 'data' not in body:
        raise HTTPException(status_code=400, detail="Missing data")

    DynamoDBGateway(DB_FEEDBACK).write(body['data'])

    return {"message": "success"}


if __name__ == "__main__":

    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
