import os.path
from fastapi import FastAPI, Request, UploadFile, HTTPException
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


def process_paper(pdf_file_name) -> dict:
    pdf_file_name = pdf_file_name.replace('.pdf', '')
    output_file = process_pdf_file(input_file=f'papers/{pdf_file_name}.pdf', temp_dir="temp", output_dir="output")
    with open(os.path.abspath(output_file), 'r') as f:
        f = json.load(f)
        print(f['title'])
        os.rename(f"papers/{pdf_file_name}.pdf", f"papers/{f['title'][:200]}.pdf")
        os.rename(f"temp/{pdf_file_name}.tei.xml", f"temp/{f['title'][:200]}.tei.xml")
        os.rename(f"output/{pdf_file_name}.json", f"output/{f['title'][:200]}.json")
        return f


@app.post("/get-existing-paper")
async def get_existing_paper(request: Request):
    body = await request.json()
    name = body["name"]
    print(f"{name}.json")
    print(os.listdir('output'))
    if os.path.exists('output') and f"{name}.json" in os.listdir('output'):
        print(f"Get paper. Paper exists. ({name})")
        with open(os.path.join('output', f"{name}.json"), 'r') as f:
            return json.load(f)
    else:
        raise HTTPException(status_code=404, detail="Paper not found")

@app.get("/get-paper-templates")
def get_paper_templates():
    print("Get all papers")
    return [x.replace('.json', '') for x in os.listdir("output")] if os.path.exists("output") else []

@app.post("/upload-paper")
async def upload_paper(pdf_file: UploadFile):
    try:
        pdf_file_name = pdf_file.filename
        pdf_file_content = await pdf_file.read()
        with open(f"papers/{pdf_file_name}", "wb") as f:
            f.write(pdf_file_content)
        json_paper = process_paper(pdf_file_name)
        return json_paper
    except Exception as e:
        print(e)
        return {"error": str(e)}


@app.post("/ask")
async def ask(request: Request):
    body = await request.json()
    text = body["text"]
    print(f"Asked text: \n{text}\n")
    logging.critical('\n---\Asked text: \n' + text)
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
            model="text-davinci-003",
        )["choices"][0]["text"].strip("\n")
        write_to_json_cache(text, response)
        print("Response: \n" + response)
        
    logging.critical('\n---\Answer: \n' + response)
    return {"message": response}
