import datetime
import os.path
import traceback
import uuid
import hashlib

from fastapi import FastAPI, Request, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import openai
from doc2json.grobid2json.process_pdf import process_pdf_file
import os
import json
from dotenv import load_dotenv
from mangum import Mangum
from fastapi.responses import JSONResponse

load_dotenv()
import requests
import boto3

openai.api_key = os.environ["OPENAI_KEY"]

LATEST_COMMIT_ID = os.getenv("LATEST_COMMIT_ID", 'local')
ENVIRONMENT = os.getenv("ENVIRONMENT", 'local')
S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME', None)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

handler = Mangum(app)

FILESYSTEM_BASE = os.getenv('FILESYSTEM_BASE', '.')

@app.middleware("http")
async def verify_discord_login(request: Request, call_next):
    if request.method == 'OPTIONS':
        return await call_next(request)

    if ENVIRONMENT != 'production':
        print("Bypassing Discord")
        return await call_next(request)
        
    auth_header = request.headers.get('Authorization', None)
    if auth_header is None:
        return JSONResponse(status_code=401, content={"message": "Missing Authorization header"})


    def verify_token(bearer_token):
        try:
            response = requests.get(
                "https://discord.com/api/users/@me",
                headers={'Authorization': bearer_token},
                allow_redirects=True)
            return response.status_code // 100 == 2
        except Exception as e:
            print(e)
            return False

    if not verify_token(auth_header):
        print("Discord did not verify token")
        return JSONResponse(status_code=401, content={"message": "Invalid Authorization header"})
    else:
        print("Discord successfully verified token")
        return await call_next(request)

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
                                   temp_dir=output_location, output_dir=output_location)
    with open(os.path.abspath(output_file), 'r') as f:
        f = json.load(f)
    print(f['title'])

    os.remove(f"{output_location}/{pdf_file_name}.pdf")
    os.remove(f"{output_location}/{pdf_file_name}.tei.xml")
    os.remove(f"{output_location}/{pdf_file_name}.json")
    print("Removed files")
    return f


def store_paper_in_s3(pdf_file: bytes, pdf_file_name: str):
    if ENVIRONMENT not in ['production', 'sandbox']:
        return

    s3 = boto3.resource('s3')
    s3.Bucket(S3_BUCKET_NAME).put_object(Key=f"papers/{pdf_file_name}", Body=pdf_file)


def write_to_dynamo(table_name: str, data: dict):
    if ENVIRONMENT.lower() not in table_name.lower():
        table_name = f"{table_name}-{ENVIRONMENT}"

    if ENVIRONMENT == 'production' or ENVIRONMENT == 'sandbox':
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(table_name)

        if 'id' not in data:
            data['id'] = str(uuid.uuid4())

        if 'created_at' not in data:
            data['created_at'] = str(datetime.datetime.now())

        data['latest_commit_id'] = LATEST_COMMIT_ID

        response = table.put_item(
            ReturnConsumedCapacity='TOTAL',
            Item=data)
        print(response)
    else:
        # todo: currently no logging, but consider using moto for local aws env
        return




@app.post("/store-feedback")
async def store_feedback(request: Request):
    body = await request.json()

    if 'table_name' not in body:
        raise HTTPException(status_code=400, detail="Missing table_name")
    if 'data' not in body:
        raise HTTPException(status_code=400, detail="Missing data")

    try:
        write_to_dynamo(body['table_name'], body['data'])
        return {"message": "success"}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Error writing to dynamo. {e}")


@app.post("/upload-paper")
async def upload_paper(pdf_file: UploadFile, request: Request, background_tasks: BackgroundTasks):

    start = datetime.datetime.now()
    email = request.headers.get('Email', None)

    try:
        pdf_file_name = pdf_file.filename
        pdf_file_content = await pdf_file.read()
        print(f"Upload paper {pdf_file_name}")

        json_paper = process_paper(pdf_file_content, pdf_file_name)

        sha256 = hashlib.sha256()
        sha256.update(json.dumps(json_paper['pdf_parse']['body_text']).encode())
        paper_hash = sha256.hexdigest()

        write_to_dynamo("HippoPrototypeJsonPapers", {
            'id': paper_hash,
            'paper_title': json_paper['title'],
            'paper_json': json.dumps(json_paper),
            'email': email,
        })


        end = datetime.datetime.now()
        time_elapsed = end - start
        background_tasks.add_task(write_to_dynamo, "HippoPrototypeFunctionInvocations", {
            'function_path': request.url.path,
            'time_elapsed': str(time_elapsed),
            'email': email,
            'paper_hash': paper_hash,
        })
        background_tasks.add_task(store_paper_in_s3, pdf_file_content, pdf_file_name)


        json_paper['id'] = paper_hash

        return json_paper
    except Exception as e:
        print(e)
        print(traceback.format_exc())

        end = datetime.datetime.now()
        time_elapsed = end - start
        background_tasks.add_task(write_to_dynamo,"HippoPrototypeFunctionInvocations", {
            'function_path': request.url.path,
            'time_elapsed': str(time_elapsed),
            'email': email,
            'error': str(e),
        })
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


def num_tokens(text) -> int:
    return int(len(text.split(' ')) * (8 / 5))  # safe rule of thumb https://beta.openai.com/tokenizer


@app.post("/ask")
async def ask(request: Request, background_tasks: BackgroundTasks):
    start = datetime.datetime.now()
    was_cut = False
    body = await request.json()
    question = body["question"]
    context = body["context"]
    quote = body["quote"]
    email = body["email"]
    try:

        max_context_tokens = 3350
        if num_tokens(context) > max_context_tokens:
            was_cut = True
            print("Text too long, was cut")
            max_length = int(len(' '.join(context.split(' ')) * max_context_tokens) / num_tokens(context))
            context = context[:max_length] + "\nEnd paper context"

        quoteText = """If the paper contains enough information to answer the request, your response must be paired with
        a quote from the provided paper (and enclose the extracted quote between double quotes).
        Every extracted quote must be in a new line.""" if quote else ''

        prompt = """Please respond to the following request, denoted by \"'Request'\" in the best way possible with the
         given paper context that bounded by \"Start paper context\" and \"End paper context\". Everytime \"paper\"
         is mentioned, it is referring to paper context denoted by \"Start paper context\" and \"End paper context\".
         {0}. If the paper does not enough information for responding to the request, please respond with \"The paper does not contain enough information 
         for answering your question\". {1}
         Start paper context:
         {2}
         :End paper context.
         Request: '{1}'
         Response:
        """.format(quoteText, question, context)

        if "this is a load test" in question:
            print("Load test!")
            prompt = 'Say hi.'

        response = openai.Completion.create(
            prompt=prompt,
            # We use temperature of 0.0 because it gives the most predictable, factual answer.
            temperature=0,
            max_tokens=500,
            model="text-davinci-003",
        )["choices"][0]["text"].strip("\n")
        print(response)

        end = datetime.datetime.now()
        time_elapsed = end - start
        background_tasks.add_task(write_to_dynamo,"HippoPrototypeFunctionInvocations", {
            'function_path': request.url.path,
            'email': email,
            'latest_commit_id': LATEST_COMMIT_ID,
            'time_elapsed': str(time_elapsed),
            'question': question,
            'prompt_text': prompt,
            'was_prompt_cut': was_cut,
            'prompt_token_length_estimate': num_tokens(prompt),
            'response_text': response,
        })

        return {"message": response}
    except Exception as e:
        print(traceback.format_exc())
        end = datetime.datetime.now()
        time_elapsed = end - start
        background_tasks.add_task(write_to_dynamo,"HippoPrototypeFunctionInvocations", {
            'function_path': request.url.path,
            'email': email,
            'latest_commit_id': LATEST_COMMIT_ID,
            'time_elapsed': str(time_elapsed),
            'question': question,
            'error': str(e),
        })
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
