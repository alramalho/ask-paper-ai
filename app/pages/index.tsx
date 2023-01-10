import { NextPage } from "next";
import { useEffect, useState } from "react";
import { Layout } from "../components/layout";
import { Button, Loading, Progress, Radio, Spacer, Text } from "@nextui-org/react";
import MarkdownView from 'react-showdown';

type Paper = {
  abstract: string
  pdf_parse: {
    body_text: {
      text: string
      section: string
    }[]
  }
}

const Home: NextPage = () => {
  const [chatGPTResponse, setChatGPTResponse] = useState<string | undefined>(undefined)
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState<boolean>(false)

  const [papers, setPapers] = useState<string[] | undefined>(undefined)
  const [selectedPaper, setSelectedPaper] = useState<Paper | undefined>(undefined)
  const [selectedPaperName, setSelectedPaperName] = useState<string | undefined>(undefined)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_PDF2JSON_APIURL}/get-papers`).then(response => response.json()).then(
      json => setPapers(json)
    )
  }, [])

  async function readPaperAbstract(path: string) {
    let paper: Paper = await fetch(`${process.env.NEXT_PUBLIC_CHATGPT_PYTHON_APIURL}/get-paper`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: path,
      })
    }).then(response => response.json());
    setSelectedPaper(paper)
    return paper.abstract
  }

  useEffect(() => {
    let intervalId: any = null;
    if (isRunning) {
      intervalId = setInterval(() => {
        setSeconds(seconds => seconds + 1);
      }, 1000);
    } else if (seconds !== 0) {
      clearInterval(intervalId);
    }
    return () => clearInterval(intervalId);
  }, [isRunning, seconds]);

  const handleSubmit = async () => {
    setSeconds(0)
    setIsRunning(true)
    const paperPath = await fetch(`${process.env.NEXT_PUBLIC_PDF2JSON_APIURL}/parse-paper?name=${selectedPaperName}`).then(response => response.json())
    const paperAbstract = await readPaperAbstract(paperPath)
    console.log(paperAbstract)

    const chatGPTResponse = await fetch(`${process.env.NEXT_PUBLIC_CHATGPT_PYTHON_APIURL}/ask`, {
      method: 'POST',
      body: JSON.stringify({
        text: `Extract the datasets present in the following text: (${paperAbstract})`,
      })
    }).then(response => response.json())
    setChatGPTResponse(chatGPTResponse.message)
    setIsRunning(false)
  }

  return (
    <Layout css={{ flexDirection: 'column' }}>
      {papers
        ? <>
          <Radio.Group label="Options" onChange={setSelectedPaperName}>
            {papers.map((elem, index) => <Radio key={elem} value={elem}>{elem}</Radio>)}
          </Radio.Group>
          <Spacer y={3} />
          <Button color="gradient" onClick={handleSubmit}>Extract Datasets</Button>
          <Spacer y={2} />
        </>
        : "No papers"
      }
      <Text h4>Time elapsed: {seconds} seconds</Text>
      {isRunning
        && <>
          <Loading type="points" >Fetching ChatGPT response...</Loading>
        </>
      }
      <br />
      {chatGPTResponse && <MarkdownView
        markdown={chatGPTResponse}
        options={{ tables: true, emoji: true }}
      />}

    </Layout>
  )
}

export default Home
