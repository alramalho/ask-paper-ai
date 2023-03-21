import axios from "axios";
import {Paper} from "../pages";

export function sendInstructionsEmail(recipient) {
  return axios.post(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/send-instructions-email`, {
    "recipient": recipient,
  })
}

export function sendAnswerEmail(recipient: string, question: string, paper_title: string) {
  const email = recipient
  return axios.post(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/send-answer-email`, {
    "recipient": recipient,
    "question": question,
    "answer": document?.getElementById('answer')?.innerHTML,
    "paper_title": paper_title,
  }, {
    headers: {
      'Email': email
    }
  })
}


interface ExtractDatasetsOptions {
  paper: Paper
  email: string
  accessToken: string
}

export function extractDatasets({paper, email, accessToken}: ExtractDatasetsOptions) {
  return axios.post(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/extract-datasets`, {
    paper: JSON.stringify(paper),
  }, {
    headers: {
      'Content-Type': 'application/json',
      // @ts-ignore
      'Authorization': `Bearer ${accessToken}`,
      'Email': email
    }
  })
}

interface SummarizeOptions {
  paper: Paper
  email: string
  accessToken: string
}

export function generateSummary({paper, email, accessToken}: SummarizeOptions) {
  return axios.post(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/summarize`, {
    paper: JSON.stringify(paper),
  }, {
    headers: {
      'Content-Type': 'application/json',
      // @ts-ignore
      'Authorization': `Bearer ${accessToken}`,
      'Email': email
    }
  })
}
interface AskOptions {
  paperHash: string,
  accessToken: string,
  email: string,
  question: string,
  paper: Paper,
}
export function askPaper({question, paper, email, accessToken, paperHash}: AskOptions) {
  return axios.post(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/ask`, {
    question,
    paper: JSON.stringify(paper),
    paper_hash: paperHash
  }, {
    headers: {
      'Content-Type': 'application/json',
      // @ts-ignore
      'Authorization': `Bearer ${accessToken}`,
      'Email': email
    }
  })
}

export function getRemainingRequestsFor(email: string) {
  return axios.get(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/user-remaining-requests-count`, {
    headers: {
      'Email': email
    }
  })
}