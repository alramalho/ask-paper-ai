import os.path
from fastapi import FastAPI, Request
from doc2json.grobid2json.process_pdf import process_pdf_file
import os
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/get-paper")
async def getpaper(path: str):
    with open(path, "r") as f:
        return json.load(f)

@app.get("/get-papers")
def getpapers():
    return os.listdir("papers")


@app.get("/parse-paper")
def parsepaper(name: str):
    input_dir = "papers"
    temp_dir = "temp"
    output_dir = "output"
    output_file = process_pdf_file(input_file=f'{input_dir}/{name}', temp_dir=temp_dir, output_dir=output_dir)
    abs_output_file = os.path.abspath(output_file)
    return abs_output_file
