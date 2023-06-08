import axios, { AxiosResponse } from "axios";
import {Paper} from "../pages";
import { ChatMessage } from "../components/chat/chat";

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
  email: string
  accessToken: string
}

interface ExtractDatasetsEndpointOptions extends DefaultEndpointOptions {
  paper: Paper
  resultsSpeedTradeoff: number
  history: ChatMessage[]
}


export function extractDatasets({ history, paper, email, accessToken, resultsSpeedTradeoff }: ExtractDatasetsEndpointOptions, options: RequestInit) {
  return fetch(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/extract-datasets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Email': email
    },
    body: JSON.stringify({
      history: JSON.stringify(history),
      paper: JSON.stringify(paper),
      results_speed_trade_off: resultsSpeedTradeoff
    }),
    ...options
  })
}

interface GenerateSummaryEndpointOptions extends DefaultEndpointOptions {
  paper: Paper
}

export function generateSummary({ paper, email, accessToken }: GenerateSummaryEndpointOptions, options: RequestInit) {
  return fetch(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/summarize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Email': email
    },
    body: JSON.stringify({
      paper: JSON.stringify(paper)
    }),
    ...options
  })
}

interface ExplainSelectedTextProps extends DefaultEndpointOptions {
  text: string;
  paper: Paper;
  history: ChatMessage[]
}

export function explainSelectedText({ text, history, paper, email, accessToken }: ExplainSelectedTextProps, options: RequestInit) {
  return fetch(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/explain`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Email': email
    },
    body: JSON.stringify({
      text,
      history: JSON.stringify(history),
      paper: JSON.stringify(paper)
    }),
    ...options
  })
}

interface AskOptions extends DefaultEndpointOptions {
  history: ChatMessage[],
  paperHash: string,
  paper: Paper,
  resultsSpeedTradeoff: number,
  question: string,
  quote: boolean
}

export function askPaper({question, history, paper, email, accessToken, paperHash, quote, resultsSpeedTradeoff}: AskOptions, options: RequestInit) {
  return fetch(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Email': email
    },
    body: JSON.stringify({
      question,
      history: JSON.stringify(history),
      paper: JSON.stringify(paper),
      paper_hash: paperHash,
      quote,
      results_speed_trade_off: resultsSpeedTradeoff
    }),
    ...options
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
  return axios.get(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/get-datasets`, {
    headers: {
      'Email': email,
      'Authorization': `Bearer ${accessToken}`, // todo: we should have the user ID in the frontend. this is weird
    }
  })
}

interface UpdateDatasetsOptions {
  datasets: object,
  paperTitle: string,
  email: string,
  accessToken: string
}


export function updateDatasets({ datasets, paperTitle, email, accessToken }: UpdateDatasetsOptions): Promise<AxiosResponse>{
  return axios.put(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/update-datasets`, {
    datasets: JSON.stringify(datasets),
    paper_title: paperTitle
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Email': email,
      'Authorization': `Bearer ${accessToken}`
    }
  });
}


interface SaveDatasetsOptions extends DefaultEndpointOptions {
  datasets: object,
  changes: object
}

export function saveDatasets({ datasets, changes, email, accessToken }: SaveDatasetsOptions) {
  return axios.post(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/save-datasets`, {
    datasets: JSON.stringify(datasets),
    changes: JSON.stringify(changes)
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Email': email,
      'Authorization': `Bearer ${accessToken}`
    }
  }).then(res => res.data);
}
