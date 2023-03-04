"""
Flask app for S2ORC pdf2json utility
"""
import hashlib
import requests
from flask import Flask, request, jsonify, flash, url_for, redirect, render_template, send_file
from doc2json.grobid2json.process_pdf import process_pdf_stream
from doc2json.tex2json.process_tex import process_tex_stream
from doc2json.jats2json.process_jats import process_jats_stream
from doc2json.utils.file_util import FILE_TYPES, unknow_type

app = Flask(__name__)

ALLOWED_EXTENSIONS = {'pdf', 'gz', 'nxml'}


@app.route('/')
def home():
    return render_template("home.html")

@app.route('/', methods=['POST'])
def upload_file():
    uploaded_file = request.files['file']
    if uploaded_file.filename != '':
        filename = uploaded_file.filename
        extension = filename.split('.')[-1]
        return FILE_TYPES.get(extension, unknow_type())

    return redirect(url_for('index'))

@app.route('/upload_url')
def upload_url():
    url = request.args.get('url')
    filename = "unknown"
    pdf_content = requests.get(url).content
    # compute hash
    pdf_sha = hashlib.sha1(pdf_content).hexdigest()
    # get results
    results = process_pdf_stream(filename, pdf_sha, pdf_content)
    return jsonify(results)

if __name__ == '__main__':
    app.run(port=8080, host='0.0.0.0')
