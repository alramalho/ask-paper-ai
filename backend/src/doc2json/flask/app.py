"""
Flask app for S2ORC pdf2json utility
"""
import hashlib
import requests
from flask import Flask, request, jsonify, flash, url_for, redirect, render_template, send_file
from doc2json.grobid2json.process_pdf import process_pdf_stream
from doc2json.utils.file_util import process_file

app = Flask(__name__)


@app.route('/')
def home():
    return render_template("home.html")

@app.route('/', methods=['POST'])
def upload_file():
    uploaded_file = request.files['file']
    if uploaded_file.filename != '':
        # TODO create test for the method below
        return process_file(upload_file)

    return redirect(url_for('index'))

@app.route('/upload_url')
def upload_url():
    url = request.args.get('url')
    # TODO improve the way to retrieve query parameters.
    filename = "unknown"
    pdf_content = requests.get(url).content
    # compute hash
    pdf_sha = hashlib.sha1(pdf_content).hexdigest()
    # get results
    results = process_pdf_stream(filename, pdf_sha, pdf_content)
    return jsonify(results)

if __name__ == '__main__':
    app.run(port=8080, host='0.0.0.0')
