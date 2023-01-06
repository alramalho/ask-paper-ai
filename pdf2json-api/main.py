import os.path

from fastapi import FastAPI
from doc2json.grobid2json.process_pdf import process_pdf_file
import time
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/get-papers")
def getpapers():
    return os.listdir("papers")


@app.get("/parse-paper")
def parsepaper(name: str):
    input_dir = "papers"
    temp_dir = "temp"
    output_dir = "output"
    start_time = time.time()
    output_file = process_pdf_file(input_file=f'{input_dir}/{name}', temp_dir=temp_dir, output_dir=output_dir)
    abs_output_file = os.path.abspath(output_file)
    return {"output_file": abs_output_file, "timeElapsedInSeconds": round(time.time() - start_time, 3)}
