import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config()
import express from 'express'
import axios from 'axios';
import fs from 'fs';
import cors from 'cors';
import {ChatGPTAPIBrowser} from 'chatgpt'

const PORT = 4000
const app = express();
let api = undefined

app.use(express.json());
app.use(cors())

app.get('/find-datasets', async (req, res) => {
    const result = await api.sendMessage("Extract the datasets present in the following text: \n" + req.body.text)
    res.json(result)

});
app.get('/extract-ds-from-paper', async (req, res) => {
    axios.get(`${process.env.PDF2JSON_APIURL}/parse-paper?name=${req.query.name}`)
        .then(async (response) => {
            const jsonPaperPath = response.data["output_file"]
            const paper = readJSON(jsonPaperPath)
            const result = await api.sendMessage("Extract the datasets present in the following text: \n" + paper.abstract)
            res.json(result)
        })
        .catch(error => {
            console.log(error);
            res.sendStatus(500)
        });
});

app.listen(PORT, async () => {
    api = new ChatGPTAPIBrowser({
        email: process.env.OPENAI_EMAIL,
        password: process.env.OPENAI_PASSWORD,
        isMicrosoftLogin: true
    })

    await api.initSession()
    console.log(`API ready! Server listening on port ${PORT}`);
});

function readJSON(filename) {
    const data = fs.readFileSync(filename, 'utf8');
    return JSON.parse(data);
}