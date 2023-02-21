import datetime
import os.path

from fastapi import FastAPI, Request, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import openai
from doc2json.grobid2json.process_pdf import process_pdf_file
import os
import json
from mangum import Mangum
from constants import OPENAI_KEY, LATEST_COMMIT_ID, FILESYSTEM_BASE
from aws import write_to_dynamo, store_paper_in_s3
from middleware import verify_discord_login, write_all_errors_to_dynamo


openai.api_key = OPENAI_KEY
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.middleware("http")(verify_discord_login)
app.middleware("http")(write_all_errors_to_dynamo)

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
                                   grobid_config={'grobid_url': os.getenv('GROBID_URL', 'https://kermitt2-grobid.hf.space')})
    with open(os.path.abspath(output_file), 'r') as f:
        f = json.load(f)
    print(f['title'])

    os.remove(f"{output_location}/{pdf_file_name}.pdf")
    # os.remove(f"{output_location}/{pdf_file_name}.tei.xml")
    os.remove(f"{output_location}/{pdf_file_name}.json")
    print("Removed files")

    return f

@app.post("/upload-paper")
async def upload_paper(pdf_file: UploadFile, request: Request, background_tasks: BackgroundTasks):

    start = datetime.datetime.now()
    email = request.headers.get('Email', None)
    pdf_file_name = pdf_file.filename
    pdf_file_content = await pdf_file.read()
    print(f"Upload paper {pdf_file_name}")

    json_paper = process_paper(pdf_file_content, pdf_file_name)

    paper_hash = generate_hash(json.dumps(json_paper['pdf_parse']['body_text']))

    write_to_dynamo("HippoPrototypeJsonPapers", {
        'id': paper_hash,
        'paper_title': json_paper['title'],
        'paper_json': json.dumps(json_paper),
        'email': email,
    })

    time_elapsed = datetime.datetime.now() - start

    background_tasks.add_task(write_to_dynamo, "HippoPrototypeFunctionInvocations", {
        'function_path': request.url.path,
        'time_elapsed': str(time_elapsed),
        'email': email,
        'paper_hash': paper_hash,
    })
    background_tasks.add_task(store_paper_in_s3, pdf_file_content, paper_hash)

    json_paper['id'] = paper_hash

    return json_paper


def text_to_ntokens(text) -> int:
    return int(len(text.split(' ')) * (8 / 5))  # safe rule of thumb https://beta.openai.com/tokenizer

def ntokens_to_nwords(tokens) -> str:
    return tokens * 5 / 8


import math
def split_text_into_chunks(text, max_words):
    words = text.split()
    num_tokens = math.ceil(len(words) * 8 / 5) # calculate number of tokens
    if num_tokens <= max_words: # if within limit, return original text
        return [text]
    else:
        chunks = []
        current_chunk = ""
        current_tokens = 0
        for word in words:
            if current_tokens + 1 > max_words: # if adding current word would exceed token limit, start new chunk
                chunks.append(current_chunk.strip())
                current_chunk = word + " "
                current_tokens = 1
            else:
                current_chunk += word + " "
                current_tokens += 1
        chunks.append(current_chunk.strip()) # add last chunk
        return chunks

@app.post("/ask")
async def ask(request: Request, background_tasks: BackgroundTasks):
    start = datetime.datetime.now()
    body = await request.json()
    question = body["question"]
    quote = body["quote"]
    email = body["email"]
    context_chunks = split_text_into_chunks(body['context'], ntokens_to_nwords(3350))
    context = context_chunks[0] + "\nEnd paper context"
    print(context)

    was_cut = len(context_chunks) > 1
    if was_cut:
        print("Text too long, was cut")

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
        'prompt_token_length_estimate': text_to_ntokens(prompt),
        'response_text': response,
    })
    return {"message": response}


@app.post("/store-feedback")
async def store_feedback(request: Request):
    body = await request.json()

    if 'table_name' not in body:
        raise HTTPException(status_code=400, detail="Missing table_name")
    if 'data' not in body:
        raise HTTPException(status_code=400, detail="Missing data")

    write_to_dynamo(body['table_name'], body['data'])
    import asyncio
    await asyncio.sleep(5)
    return {"message": "success"}




if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
