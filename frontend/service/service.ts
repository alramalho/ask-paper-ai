import axios from "axios";

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

export function askPaper(accessToken: string, email: string, question: string, context: string, quote: boolean = false) {
  return axios.post(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/ask`, {
    question,
    context,
    quote,
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