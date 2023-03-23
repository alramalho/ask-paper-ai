import axios from "axios";
import {Paper} from "../pages";

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

export function extractDatasets({paper, email, accessToken, resultsSpeedTradeoff}: DefaultEndpointOptions) {
  return axios.post(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/extract-datasets`, {
    paper: JSON.stringify(paper),
    results_speed_trade_off: resultsSpeedTradeoff
  }, {
    headers: {
      'Content-Type': 'application/json',
      // @ts-ignore
      'Authorization': `Bearer ${accessToken}`,
      'Email': email
    }
  })
}


export function generateSummary({paper, email, accessToken, resultsSpeedTradeoff}: DefaultEndpointOptions) {
  return axios.post(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/summarize`, {
    paper: JSON.stringify(paper),
    results_speed_trade_off: resultsSpeedTradeoff
  }, {
    headers: {
      'Content-Type': 'application/json',
      // @ts-ignore
      'Authorization': `Bearer ${accessToken}`,
      'Email': email
    }
  })
}
interface AskOptions extends DefaultEndpointOptions {
  paperHash: string,
  accessToken: string,
  question: string,
  quote: boolean
}

export function askPaper({question, paper, email, accessToken, paperHash, quote, resultsSpeedTradeoff}: AskOptions) {
  return axios.post(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/ask`, {
    question,
    paper: JSON.stringify(paper),
    paper_hash: paperHash,
    quote,
    results_speed_trade_off: resultsSpeedTradeoff
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