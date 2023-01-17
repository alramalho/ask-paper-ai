import os.path
from fastapi import FastAPI, Request, Response
import os
from fastapi.middleware.cors import CORSMiddleware
from revChatGPT.ChatGPT import Chatbot
from dotenv import load_dotenv
from transformers import pipeline
import logging
import datetime
import time
from selenium import webdriver
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import WebDriverException

logging.basicConfig(filename=os.path.join(os.getcwd(), 'test.log'), level=logging.CRITICAL, force=True)

import json
load_dotenv()

logging.critical('\n---\nStarting up with date: ' + str(datetime.datetime.now()))
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
chatbot = Chatbot({
    "email": os.getenv("MICROSOFT_EMAIL"),
    "password": os.getenv("MICROSOFT_PASSWORD"),
    "isMicrosoftLogin": True
}, conversation_id=None, parent_id=None)

driver = None

@app.post("/get-paper")
async def getpapers(request: Request):
    body = await request.json()
    path = body["path"]
    logging.critical('\n---\nGot paper at: ' + path)
    with open(path, "r") as f:
        return json.load(f)

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
        response = chatbot.ask(text, conversation_id=None, parent_id=None)
        response = response["message"]
        write_to_json_cache(text, response)
        print(response)
    logging.critical('\n---\Answer: \n' + response)
    return {"message": response}

MAX_RETRIES = 3
@app.post("/search")
async def search(request: Request):
    global driver
    if driver is None:
        driver = webdriver.Chrome()
    try:
        body = await request.json()
        name = body["name"]

        driver.get(f"https://datasetsearch.research.google.com/search?query={name}")
        driver.implicitly_wait(0.5)
        a_element = driver.find_element("xpath", "//div[contains(text(), \"Explore at:\")]//ul//li[1]//a")

        result = a_element.get_attribute("href")
        return {"result": result}
    except WebDriverException as e:
        if "Session not found" in str(e) or "invalid session id" in str(e):
            driver.quit()
            driver = webdriver.Chrome()
            search(request)
        elif "no such element" in str(e):
            return {"result": None}
        else:
            raise e
    except Exception as error:
        return Response(content=f"Internal Server Error: {error}", status_code=500)