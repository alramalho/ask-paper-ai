import os.path
import traceback

from fastapi import FastAPI, Request, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import openai
from doc2json.grobid2json.process_pdf import process_pdf_file
import os
import json
from dotenv import load_dotenv
from mangum import Mangum
load_dotenv()

openai.api_key = os.getenv("OPENAI_KEY")

app = FastAPI()
handler = Mangum(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FILESYSTEM_BASE = os.getenv('FILESYSTEM_BASE', '.')

def process_paper(pdf_file_name) -> dict:
    pdf_file_name = pdf_file_name.replace('.pdf', '')
    output_file = process_pdf_file(input_file=f'{FILESYSTEM_BASE}/papers/{pdf_file_name}.pdf', temp_dir=f"{FILESYSTEM_BASE}/temp", output_dir=f"{FILESYSTEM_BASE}/output")
    with open(os.path.abspath(output_file), 'r') as f:
        f = json.load(f)
        print(f['title'])
        os.rename(f"{FILESYSTEM_BASE}/papers/{pdf_file_name}.pdf", f"{FILESYSTEM_BASE}/papers/{f['title'][:200]}.pdf")
        os.rename(f"{FILESYSTEM_BASE}/temp/{pdf_file_name}.tei.xml", f"{FILESYSTEM_BASE}/temp/{f['title'][:200]}.tei.xml")
        os.rename(f"{FILESYSTEM_BASE}/output/{pdf_file_name}.json", f"{FILESYSTEM_BASE}/output/{f['title'][:200]}.json")
        return f

@app.post("/upload-paper")
async def upload_paper(pdf_file: UploadFile):
    try:
        pdf_file_name = pdf_file.filename
        pdf_file_content = await pdf_file.read()
        print(f"Upload paper {pdf_file_name}")
        output_location = f"{FILESYSTEM_BASE}/papers"
        if not os.path.exists(output_location):
            os.mkdir(output_location)
            print("created dir")
        with open(f"{output_location}/{pdf_file_name}", "wb") as f:
            f.write(pdf_file_content)
            print("created file")
        json_paper = process_paper(pdf_file_name)
        print(f"Success! Returned json {json_paper}")
        return json_paper
    except Exception as e:
        print(e)
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

def num_tokens(text):
    return len(text.split(' ')) * (8/5)  # safe rule of thumb https://beta.openai.com/tokenizer

@app.post("/ask")
async def ask(request: Request):
    try:
        body = await request.json()
        question = body["question"]
        context = body["context"]
        text = f"Please answer the following request, denoted by \"Request:\" in the best way possible with the given paper context that bounded by \"Start paper context\" and \"End paper context\". Everytime \"paper\" is mentioned, it is referring to paper context denoted by \"Start paper context\" and \"End paper context\". \nRequest: {question}\nStart paper context\n{context}\nEnd paper context"
        print(f"Asked text: \n{text}\n")
        if num_tokens(text) > 3500:
            print("Text too long, was cut")
            max_length = int(len(' '.join(text.split(' ')) * 3500) / num_tokens(text))
            text = text[:max_length] + "\nEnd paper context"

        print(f"Used text: \n{text}\n")

        response = openai.Completion.create(
            prompt=text,
            # We use temperature of 0.0 because it gives the most predictable, factual answer.
            temperature=0,
            max_tokens=500,
            model="text-davinci-003",
        )["choices"][0]["text"].strip("\n")
        print("Response: \n" + response)

        return {"message": response}
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)