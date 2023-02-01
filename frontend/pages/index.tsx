import {Text, Button, Card, Spacer, Loading, Textarea, useInput, Image} from "@nextui-org/react";
import {useEffect, useState} from "react";
import MarkdownView from "react-showdown";
import SendIcon from "../components/icons/send-icon";
import {Box, Layout} from "../components/layout";
import {Flex} from "../components/styles/flex";
import PaperUploader from "../components/paper-uploader";
import axios from "axios";
import {DiscordSessionWrapper} from "../components/discord-session-wrapper";
import Feedback from "../components/feedback";

export type Paper = {
  abstract: string
  title: string
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

const Home = () => {
  const [LLMResponse, setLLMResponse] = useState<string | undefined>(undefined)
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [loadingText, setLoadingText] = useState<string | undefined>(undefined)
  const [selectedPaper, setSelectedPaper] = useState<Paper | undefined | null>(undefined)

  const {
    value: questionValue,
    setValue: setQuestionValue,
    reset: resetQuestion,
    bindings,
  } = useInput("");


  const handleSubmit = (paper: Paper, question: string, quote: boolean = false, sectionFilterer: (sectionName: string) => boolean = (sectionName: string) => true) => {
    setIsRunning(true)
    setLoadingText("Reading paper...")

    const aggreggatedText = paper.abstract + paper.pdf_parse.body_text.concat(paper.pdf_parse.back_matter).filter(e => sectionFilterer(e.section)).map(bodyText => bodyText.text).join('\n')

    askPaper(question, aggreggatedText, quote)
      .then(res => {
        setLLMResponse(makeLinksClickable(res.data.message))
      })
      .catch(error => {
        if (error.response) {
          setLLMResponse("Something went wrong with server's response...</br>Details: " + error.response.data.detail)
        } else {
          setLLMResponse("Something went wrong...</br>Technical Details: " + error.message)
        }
        console.error(error)
      })
      .finally(() => {
        setIsRunning(false)
      })
  }

  return <Layout>
    <DiscordSessionWrapper>
      <h2>Ask Paper</h2>
      <PaperUploader onFinish={(paper) => setSelectedPaper(paper)}/>
      <Spacer y={3}/>
      {selectedPaper && <>
          <Spacer y={3}/>
          <h4>And ask your question</h4>
          <Flex css={{gap: "$5"}}>

              <Textarea
                {...bindings}
                fullWidth
                size="lg"
                minRows={4}
                maxRows={20}
                placeholder="Type your question here..."
                // @ts-ignore
                css={{width: "400px", maxWidth: "100%", margin: "$2"}}
              />
              <Button iconRight={<SendIcon/>} onPress={() => handleSubmit(
                selectedPaper,
                questionValue,
                true,
                (e) => ![
                  "reference",
                  "acknowledgement",
                  "appendi",
                  "discussion",
                  "declaration",
                  "supplem"
                ].includes(e.toLowerCase())
              )}> Ask </Button>
          </Flex>
          <Spacer y={2}/>
          <h4>Or start with predefined action:</h4>
          <Button
              css={{backgroundColor: "$selection", color: "black"}}
              onPress={() => {
                handleSubmit(
                  selectedPaper,
                  `Please summarize the following text on a markdown table. The text will contain possibly repeated information about the characteristics of one or more datasets. I want you to summarize the whole text into a markdown table that represents the characteristics of all the datasets. The resulting table should be easy to read and contain any information that might be useful for medical researchers thinking about using any of those datasets. Some example fields would be "Name", "Size", "Demographic information", "Origin" and "Data or code link to find more", but add as many as you think are relevant for a medical researcher. The resulting table should contain as many entries as possible but it should NOT contain any duplicates (columns with the same "Name" field) and it should NOT contain any entries where the "Name" field is not defined/unknown/ not specified.`,
                  false,
                  (e) => e.toLowerCase().includes('data')
                )
              }}
          >
              <Text>Extract datasets</Text>
          </Button>
          <Spacer y={4}/>
          <h3>Answer:</h3>
        {isRunning
          && <>
                <Loading type="points">{loadingText}</Loading>
            </>
        }
        {LLMResponse &&
            <>
                <Box css={{textAlign: 'left', margin: '$6'}}>
                    <MarkdownView
                        markdown={LLMResponse}
                        options={{tables: true, emoji: true,}}
                    />
                </Box>
                <Feedback/>
            </>
        }
      </>}
    </ DiscordSessionWrapper>
  </Layout>
    ;
};

function askPaper(question: string, context: string, quote: boolean = false) {
  return axios.post(`${process.env.NEXT_PUBLIC_BACKEND_APIURL}/ask`, {question, context, quote}, {
    headers: {
      'Content-Type': 'application/json',
      // @ts-ignore
      'Authorization': `Bearer ${session!.accessToken}`,
    }
  })
}

function makeLinksClickable(text: string) {
  return text.replace(/(https?:\/\/[^\s]+)/g, "<a target=\"__blank\" href='$1'>$1</a>");
}

export default Home;