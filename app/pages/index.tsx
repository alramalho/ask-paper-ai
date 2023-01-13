import {NextPage} from "next";
import {useEffect, useState} from "react";
import {Box, Layout} from "../components/layout";
import {Button, Loading, Progress, Radio, Spacer, Text} from "@nextui-org/react";
import MarkdownView from 'react-showdown';

type Paper = {
  abstract: string
  pdf_parse: {
    body_text: {
      text: string
      section: string
    }[],
    back_matter: {
      text: string
      section: string
    }[]
  }
}

const Home: NextPage = () => {
  const [LLMResponse, setLLMResponse] = useState<string | undefined>(undefined)
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [loadingText, setLoadingText] = useState<string | undefined>(undefined)

  const [papers, setPapers] = useState<string[] | undefined>(undefined)
  const [selectedPaper, setSelectedPaper] = useState<Paper | undefined>(undefined)
  const [selectedPaperName, setSelectedPaperName] = useState<string | undefined>(undefined)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_PDF2JSON_APIURL}/get-papers`).then(response => response.json()).then(
      json => setPapers(json)
    )
  }, [])

  async function getPaper(path: string) {
    let paper: Paper = await fetch(`${process.env.NEXT_PUBLIC_PDF2JSON_APIURL}/get-paper?path=${path}`).then(response => response.json());
    setSelectedPaper(paper)
    return paper
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
    setLoadingText("Reading paper abstract...")
    const paperPath = await fetch(`${process.env.NEXT_PUBLIC_PDF2JSON_APIURL}/parse-paper?name=${selectedPaperName}`).then(response => response.json())
    const paper = await getPaper(paperPath)
    console.log(selectedPaperName)
    console.log("Abstract: ")
    console.log(paper.abstract);


    const responses = [await extractDatasets(paper.abstract)]
    setLLMResponse(responses[0])

    for (const bodyText of paper.pdf_parse.body_text.concat(paper.pdf_parse.back_matter)) {
      if (bodyText.section.toLowerCase().includes('data')) {
        console.log(bodyText.section + ": ")
        console.log(bodyText.text)
        setLoadingText(`Reading ${bodyText.section} section...`)
        const response = await extractDatasets(bodyText.text)
        responses.push(response)
      }
      setLLMResponse(responses.join('\n'))
    }

    setLoadingText(`Summarizing the findings...`)
    const tableSummary = await toTable(responses.join('\n'))
    setLLMResponse(tableSummary)

    setLoadingText(`Injecting Source URLs...`)
    setLLMResponse(await updateMarkdownTableWithSourceURLs(tableSummary))//, "RibFrac Dataset", "Source URL", `<a href="${datasetSource}" target="_blank">${datasetSource}</a>`))
    console.log(LLMResponse)

    setIsRunning(false)
  }

  return (
    <Layout css={{flexDirection: 'column'}}>
      {papers
        ? <>
          <Radio.Group label="Options" onChange={setSelectedPaperName}>
            {papers.map((elem, index) => <Radio key={elem} value={elem}>{elem}</Radio>)}
          </Radio.Group>
          <Spacer y={3}/>
          <Button color="gradient" onClick={handleSubmit}>Extract Datasets</Button>
          <Spacer y={2}/>
        </>
        : "No papers"
      }
      <Text h4>Time elapsed: {seconds} seconds</Text>
      {isRunning
        && <>
              <Loading type="points">{loadingText}</Loading>
          </>
      }
      <br/>
      {LLMResponse &&
          <Box css={{textAlign: 'left', margin: '$6'}}>
              <MarkdownView
                  markdown={LLMResponse}
                  options={{tables: true, emoji: true,}}
              />
          </Box>
      }

    </Layout>
  )
}


async function extractDatasets(text: string) {
  return (await fetch(`${process.env.NEXT_PUBLIC_CHATGPT_PYTHON_APIURL}/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: `Extract the datasets and their characteristics in a nested list manner from the following text: ${text}`,
      // text: `Extract the datasets and their characteristics – include "probable source url" as a characteristic – in a nested list manner from the following text: ${text}`,
    })
  }).then(response => response.json()).catch(console.error)).message;
}


async function toTable(text: string) {
  return (await fetch(`${process.env.NEXT_PUBLIC_CHATGPT_PYTHON_APIURL}/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: `Based on the following text, denoted by "START OF TEXT" and "END OF TEXT", merge the mentioned dataset data characteristics into a markdown table. Please include at least "size", "data type", "demographic balance", "origin" and others that you might find relevant, just have in mind that it has to be related to the data itself. If there are entries with the same Dataset Name, merge them together. \n--- START OF TEXT\n${text}--- END OF TEXT`,
      // text: `Extract the datasets and their characteristics in a nested list manner from the following text: ${text}`,
    })
  }).then(response => response.json()).catch(console.error)).message;
}

async function searchDataset(dataset: string) {
  return (await fetch(`${process.env.NEXT_PUBLIC_CHATGPT_PYTHON_APIURL}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: dataset
    })
  }).then(response => response.json()).catch(() => "couldn't find dataset")).result;
}

async function updateMarkdownTableWithSourceURLs(tableString: string) {
  let lines = tableString.split("\n");
  let headers = lines[0].split("|").map(s => s.trim());
  let dividers = lines[1].split("|").map(s => s.trim());
  const fieldToAdd = "Source URL"
  let fieldToAddIndex = headers.indexOf(fieldToAdd);

  if (fieldToAddIndex === -1) {
    headers.push(fieldToAdd);
    dividers.push('---');
    lines[0] = headers.join(" | ");
    lines[1] = dividers.join(" | ");
    for (let i = 1; i < lines.length; i++) {
      let cells = lines[i].split("|").map(s => s.trim());
      cells.push("");
      lines[i] = cells.join(" | ");
    }
    fieldToAddIndex = headers.length - 1;
  }

  for (let i = 2; i < lines.length; i++) {
    let cells = lines[i].split("|").map(s => s.trim());
    const datasetSource = await searchDataset(cells[1]);
    if (datasetSource != null) {
      cells[fieldToAddIndex] = `<a href="${datasetSource}" target="_blank">${datasetSource}</a>`
    } else {
      cells[fieldToAddIndex] = "couldn't find dataset"
    }
    lines[i] = cells.join(" | ");
  }

  return lines.join("\n");
}

export default Home;