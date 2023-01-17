import json
import os.path
from fastapi import FastAPI, Request
import os
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import logging
import datetime
import time
import openai

load_dotenv()
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


@app.post("/get-paper")
async def getpapers(request: Request):
    body = await request.json()
    path = body["path"]
    logging.critical('\n---\nGot paper at: ' + path)
    with open(path, "r") as f:
        return json.load(f)


@app.post("/ask")
async def ask(request: Request):
    body = await request.json()
    text = body["text"]
    print(text)
    logging.critical('\n---\nAsked text: \n' + text)
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
