import axios from "axios";
import {Paper} from "../pages";
import http, { ClientRequest, IncomingMessage } from 'http';
import { parse } from 'url';

export function sendInstructionsEmail(recipient) {
  return axios.post(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/send-instructions-email`, {
    "recipient": recipient,
  })
}

interface SendAnswerEmailProps {
  email: string,
  question: string,
  answer: string,
  paperTitle: string
}

export function sendAnswerEmail({email, question, paperTitle, answer}: SendAnswerEmailProps) {
  return axios.post(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/send-answer-email`, {
    recipient: email,
    question: question,
    answer: answer,
    paper_title: paperTitle,
  }, {
    headers: {
      'Email': email
    }
  })
}

interface DefaultEndpointOptions {
  resultsSpeedTradeoff: number
  paper: Paper
  email: string
  accessToken: string
}

export function extractDatasets({ paper, email, accessToken, resultsSpeedTradeoff }: DefaultEndpointOptions) {
  return fetch(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/extract-datasets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Email': email
    },
    body: JSON.stringify({
      paper: JSON.stringify(paper),
      results_speed_trade_off: resultsSpeedTradeoff
    })
  })
}

export function generateSummary({ paper, email, accessToken }: DefaultEndpointOptions) {
  return fetch(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/summarize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Email': email
    },
    body: JSON.stringify({
      paper: JSON.stringify(paper)
    })
  })
}

interface ExplainSelectedTextProps {
  text: string;
  paper: Paper;
  email: string;
  accessToken: string;
}

export function explainSelectedText({ text, paper, email, accessToken }: ExplainSelectedTextProps) {
  return fetch(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/explain`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Email': email
    },
    body: JSON.stringify({
      text: text,
      paper: JSON.stringify(paper)
    })
  })
}

interface AskOptions extends DefaultEndpointOptions {
  history: string[],
  paperHash: string,
  accessToken: string,
  question: string,
  quote: boolean
}

export function askPaper({question, history, paper, email, accessToken, paperHash, quote, resultsSpeedTradeoff}: AskOptions) {
  return fetch(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Email': email
    },
    body: JSON.stringify({
      question,
      history,
      paper: JSON.stringify(paper),
      paper_hash: paperHash,
      quote,
      results_speed_trade_off: resultsSpeedTradeoff
    })
  });
}


export function getRemainingRequestsFor(email: string) {
  return axios.get(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/user-remaining-requests-count`, {
    headers: {
      'Email': email
    }
  })
}

export function loadDatasetsForUser(email: string, accessToken: string) {
  return axios.get(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/user-datasets`, {
    headers: {
      'Email': email,
      'Authorization': `Bearer ${accessToken}`, // todo: we should have the user ID in the frontend. this is weird
    }
  })
}

interface SaveDatasetsOptions {
  datasets: object,
  paperTitle: string,
  email: string,
  accessToken: string
}

export function saveDatasets({ datasets, paperTitle, email, accessToken }: SaveDatasetsOptions) {
  return fetch(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/save-datasets`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Email': email,
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      datasets: JSON.stringify(datasets),
      paper_title: paperTitle
    })
  })
}
