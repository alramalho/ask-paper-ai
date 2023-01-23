import os.path
from fastapi import FastAPI, Request, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging
import datetime
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
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

def num_tokens(text):
    # tokenizer = GPT2TokenizerFast.from_pretrained("gpt2")
    # return len(tokenizer.encode(text))
    return len(text.split(' ')) * (8/5)  # safe rule of thumb https://beta.openai.com/tokenizer

@app.post("/ask")
async def ask(request: Request):
    body = await request.json()
    question = body["question"]
    context = body["context"]
    text = f"Please answer the following request, denoted by \"Request:\" in the best way possible with the given paper context that bounded by \"Start paper context\" and \"End paper context\". Everytime \"paper\" is mentioned, it is referring to paper context denoted by \"Start paper context\" and \"End paper context\". \nRequest: {question}\nStart paper context\n{context}\nEnd paper context"
    print(f"Asked text: \n{text}\n")
    logging.critical('\n---\Asked text: \n' + text)
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
        
    logging.critical('\n---\Answer: \n' + response)
    return {"message": response}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)