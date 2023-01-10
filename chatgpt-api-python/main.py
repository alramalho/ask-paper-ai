import os.path
from fastapi import FastAPI, Request
import os
from fastapi.middleware.cors import CORSMiddleware
from revChatGPT.ChatGPT import Chatbot
from dotenv import load_dotenv
import json
load_dotenv()

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

@app.post("/get-paper")
async def getpapers(request: Request):
    body = await request.body()
    body_dict = json.loads(body.decode())
    with open(body_dict["path"], "r") as f:
        return json.load(f)

@app.post("/ask")
async def ask(request: Request):
    body = await request.body()
    body_dict = json.loads(body.decode())
    print(body_dict)
    response = chatbot.ask(body_dict["text"], conversation_id=None, parent_id=None)
    return response
