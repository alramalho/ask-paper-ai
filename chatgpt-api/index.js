import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config()
import express, {json} from 'express'
import fs from 'fs';
import cors from 'cors';
import {ChatGPTAPIBrowser} from 'chatgpt'
import bodyParser from "body-parser";

const PORT = 4000
const app = express();
let api = undefined

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded
app.use(cors());

app.post('/get-paper', async (req, res) => {
    const jsonPaperPath = req.body.path
    const paper = readJSON(jsonPaperPath)
    res.send(paper)
});
app.post('/ask', async (req, res) => {
    try {
        console.log(req.body.text)
        const result = await api.sendMessage(req.body.text)
        res.json(result)
    } catch (e) {
        console.log(e)
        res.sendStatus(500)
    }
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