import axios, { AxiosResponse } from "axios";
import { ChatMessage } from "../components/chat/chat";
import { Paper } from "../pages";


function normalizeUrl(url) {
  return url.replace(/([^:]\/)\/+/g, "$1");
}
function urlEncode(string) {
  return string.replace(/ /g, "%20");
}

export function deleteCustomPrompt(title: string, email: string, accessToken: string) {
  return axios.delete(normalizeUrl(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/delete-custom-prompt/${urlEncode(title)}`), {
    headers: {
      'Content-Type': 'application/json',
      // @ts-ignore
      'Authorization': `Bearer ${accessToken}`,
      'Email': email,
    },
  })
}
export function loadCustomPrompts(email: string, accessToken: string) {
  return axios.get(normalizeUrl(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/get-custom-prompts`), {
    headers: {
      'Content-Type': 'application/json',
      // @ts-ignore
      'Authorization': `Bearer ${accessToken}`,
      'Email': email,
    },
  })
}

export function saveCustomPrompt(title: string, prompt: string, email: string, accessToken: string) {
  return axios.post(normalizeUrl(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/save-custom-prompt`), {
    "title": title,
    "prompt": prompt,
  }, {
    headers: {
      'Content-Type': 'application/json',
      // @ts-ignore
      'Authorization': `Bearer ${accessToken}`,
      'Email': email,
    },
  })
}

export function storeFeedback(email: string, data: any, accessToken: any) {
  return axios.post(normalizeUrl(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/store-feedback`), {
    "data": data,
  }, {
    headers: {
      'Content-Type': 'application/json',
      // @ts-ignore
      'Authorization': `Bearer ${accessToken}`,
      'Email': email,
    },
  })
}

export function loginAsGuest(email) {
  return axios.post(normalizeUrl(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/guest-login`), {}, {
    headers: {
      "Email": email,
    }
  })
}


export function uploadPaper(accessToken, email, formData) {
  return axios.post(normalizeUrl(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/upload-paper`), formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'Email': email,
      // @ts-ignore
      'Authorization': `Bearer ${accessToken}`,
    },
  });
}

export function sendInstructionsEmail(recipient) {
  return axios.post(normalizeUrl(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/send-instructions-email`), {
    "recipient": recipient,
  })
}

interface SendAnswerEmailProps {
  email: string,
  question: string,
  answer: string,
  paperTitle: string
}

export function sendAnswerEmail({ email, question, paperTitle, answer }: SendAnswerEmailProps) {
  return axios.post(normalizeUrl(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/send-answer-email`), {
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


interface AskOptions {
  history: ChatMessage[],
  paper: Paper,
  email: string,
  question: string,
  accessToken: string
}

export function askPaper({ question, history, email, paper, accessToken }: AskOptions, options: RequestInit) {
  return fetch(normalizeUrl(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/ask-paper`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Email': email
    },
    body: JSON.stringify({
      question,
      history: JSON.stringify(history),
      paper: JSON.stringify(paper)
    }),
    ...options
  });
}


export function getRemainingRequestsFor(email: string) {
  return axios.get(normalizeUrl(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/user-remaining-requests-count`), {
    headers: {
      'Email': email
    }
  })
}

export function loadDatasetsForUser(email: string, accessToken: string) {
  return axios.get(normalizeUrl(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/get-datasets`), {
    headers: {
      'Email': email,
      'Authorization': `Bearer ${accessToken}`,
    }
  })
}

interface UpdateDatasetsOptions {
  datasets: object,
  paperTitle: string,
  email: string,
  accessToken: string
}


export function updateDatasets({ datasets, paperTitle, email, accessToken }: UpdateDatasetsOptions): Promise<AxiosResponse> {
  return axios.put(normalizeUrl(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/update-datasets`), {
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


interface SaveDatasetsOptions {
  email: string,
  accessToken: string,
  datasets: object,
  changes: object
}

export function saveDatasets({ datasets, changes, email, accessToken }: SaveDatasetsOptions) {
  return axios.post(normalizeUrl(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/save-datasets`), {
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
