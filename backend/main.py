import json
import os.path
from fastapi import FastAPI, Request
import os
from fastapi.middleware.cors import CORSMiddleware
import logging
import datetime
import time
import openai
from doc2json.grobid2json.process_pdf import process_pdf_file
import os
import json
from dotenv import load_dotenv
load_dotenv()

# remember to install autoenv -> from some reason python dotenv was not working 🤷‍♂️
openai.api_key = os.getenv("OPENAI_KEY")
logging.basicConfig(filename=os.path.join(
    os.getcwd(), 'test.log'), level=logging.CRITICAL, force=True)


logging.critical('\n---\nStarting up with date: ' +
                 str(datetime.datetime.now()))

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

driver = None


def write_to_json_cache(key, value):
    if not os.path.exists('cache.json'):
        with open('cache.json', 'w') as f:
            json.dump({}, f)

    with open('cache.json', 'r') as f:
        data = json.load(f)

        data[key] = value

        with open('cache.json', 'w') as f:
            json.dump(data, f)


def read_from_json_cache(key):
    if not os.path.exists('cache.json'):
        return None
    with open('cache.json', 'r') as f:
        data = json.load(f)
        if (key in data):
            return data[key]
        else:
            return None


@app.get("/get-paper")
async def get_paper(path: str):

    with open(path, "r") as f:
        return json.load(f)


@app.get("/get-papers")
def get_papers():
    print("Get all papers")
    return os.listdir("papers")


@app.get("/parse-paper")
def parse_paper(name: str):
    print(f"Parse paper {name}")
    input_dir = "papers"
    temp_dir = "temp"
    output_dir = "output"
    output_file = process_pdf_file(input_file=f'{input_dir}/{name}', temp_dir=temp_dir, output_dir=output_dir)
    abs_output_file = os.path.abspath(output_file)
    return abs_output_file


@app.post("/ask")
async def ask(request: Request):
    body = await request.json()
    text = body["text"]
    print(f"Asked text: \n{text}\n")
    if (read_from_json_cache(text) is not None):
        print("cache hit")
        time.sleep(0.5)
        response = read_from_json_cache(text)
    else:
        response = openai.Completion.create(
            prompt=text,
            # We use temperature of 0.0 because it gives the most predictable, factual answer.
            temperature=0,
            max_tokens=500,
            model="text-davinci-002",
        )["choices"][0]["text"].strip("\n")
        write_to_json_cache(text, response)
        
    logging.critical('\n---\Answer: \n' + response)
    return {"message": response}
