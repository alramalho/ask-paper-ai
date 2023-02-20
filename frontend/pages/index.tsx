import {Text, Button, Spacer, Loading, Textarea, useInput, Switch, Badge} from "@nextui-org/react";
import React, {useEffect, useState} from "react";
import MarkdownView from "react-showdown";
import SendIcon from "../components/icons/send-icon";
import {Box, Layout} from "../components/layout";
import {Flex} from "../components/styles/flex";
import PaperUploader from "../components/paper-uploader";
import axios from "axios";
import FeedbackModal, {storeFeedback} from "../components/feedback-modal";
import useCustomSession from "../hooks/session";

export type Paper = {
  id: string
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
  const [quoteChecked, setQuoteChecked] = useState<boolean>(true)
  const [loadingText, setLoadingText] = useState<string | undefined>(undefined)
  const [selectedPaper, setSelectedPaper] = useState<Paper | undefined | null>(undefined)
  const [question, setQuestion] = useState<string | undefined>(undefined)
  const {data: session} = useCustomSession()
  const [isFeedbackModalVisible, setIsFeedbackModalVisible] = useState<boolean>(false)

  const {
    value: questionValue,
    setValue: setQuestionValue,
    reset: resetQuestion,
    bindings,
  } = useInput("");

  useEffect(() => {
    if (isRunning) {
      if (document.getElementById('loading-answer')) {
        // @ts-ignore
        document.getElementById('loading-answer').scrollIntoView()
      }
    }
    if (LLMResponse !== undefined) {
      if (document.getElementById('answer-area')) {
        // @ts-ignore
        document.getElementById('answer-area').scrollIntoView()
      }
    }
  }, [LLMResponse, isRunning])


  const handleSubmit = (paper: Paper, question: string, quote: boolean = false, sectionFilterer: (sectionName: string) => boolean = (sectionName: string) => true) => {
    setIsRunning(true)
    setLoadingText("Reading paper...")
    setQuestion(question)

    const aggreggatedText = paper.abstract + paper.pdf_parse.body_text
      .concat(paper.pdf_parse.back_matter)
      .filter(e => sectionFilterer(e.section))
      .map(bodyText => bodyText.text)
      .join('\n')

    askPaper(question, aggreggatedText, quote)
      .then(res => {
        setLLMResponse(makeLinksClickable(fixNewlines(res.data.message)))
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

  function askPaper(question: string, context: string, quote: boolean = false) {
    return axios.post(`${process.env.NEXT_PUBLIC_BACKEND_APIURL}/ask`, {
      question,
      context,
      quote,
      email: session!.user!.email
    }, {
      headers: {
        'Content-Type': 'application/json',
        // @ts-ignore
        'Authorization': `Bearer ${session!.accessToken}`,
      }
    })
  }


  return <Layout seo={{
    description: "Accelerating medical research. Join us today."
  }}>
    <Flex>
      <Text h2>Ask Paper</Text>
      <Badge color="error" variant="flat">
        BETA
      </Badge>
    </Flex>
    <PaperUploader onFinish={(paper) => setSelectedPaper(paper)}/>
    <Spacer y={3}/>
    {selectedPaper && <>
        <Spacer y={3}/>
        <h4>And ask your question</h4>
        <Flex css={{gap: "$5"}}>

            <Textarea
              {...bindings}
              bordered
              data-testid="ask-textarea"
              fullWidth
              size="lg"
              minRows={4}
              maxRows={20}
              placeholder="Type your question here..."
              // @ts-ignore
              css={{width: "400px", maxWidth: "100%", margin: "$2"}}
            />
            <Flex direction="column" align="start" css={{gap: "$2"}}>
                <Button
                    data-testid="ask-button"
                    iconRight={<SendIcon/>}
                    onPress={() => handleSubmit(
                      selectedPaper,
                      questionValue,
                      quoteChecked,
                      (e) => ![
                        "reference",
                        "acknowledgement",
                        "appendi",
                        "discussion",
                        "declaration",
                        "supplem"
                      ].includes(e.toLowerCase())
                    )}> Ask </Button>
                <Flex css={{gap: "$2"}}>
                    <Switch bordered initialChecked checked={quoteChecked}
                            onChange={() => setQuoteChecked(previous => !previous)}></Switch>
                    <Text small>Quote paper</Text>
                </Flex>
            </Flex>
        </Flex>
        <Spacer y={2}/>
        <h4>Or start with predefined action:</h4>
        <Flex css={{gap: '$7'}}>
            <Button
                css={{backgroundColor: "$blue200", color: "black"}}
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
            <Button
                css={{backgroundColor: "$green200", color: "black"}}
                onPress={() => {
                  handleSubmit(
                    selectedPaper,
                    `Please provide me a short summary.`,
                    false
                  )
                }}
            >
                <Text>Generate Summary</Text>
            </Button>
            <Button
                css={{
                  border: "2px solid $yellow400",
                  backgroundColor: "$background",
                  '&:hover': {
                    backgroundColor: "$yellow400",
                  }
                }}
                onPress={() => {
                  setIsFeedbackModalVisible(true)
                }}
            >
                <Text>Pick what goes here 🚀</Text>
            </Button>
        </Flex>
        <Spacer y={4}/>
        <h3>Answer:</h3>
      {isRunning
        && <>
              <Loading data-testid="loading-answer" type="points">{loadingText}</Loading>
          </>
      }
      {LLMResponse &&
          <>
              <Box id="answer-area" data-testid="answer-area" css={{textAlign: 'left', margin: '$6'}}>
                  <MarkdownView
                      markdown={LLMResponse}
                      options={{tables: true, emoji: true,}}
                  />
              </Box>
              <Spacer y={1}/>
              <Flex css={{gap: "$7"}}>

                  <Button ghost auto color="success" size="lg" iconRight="👍"
                          css={{color: 'green', '&:hover': {color: 'white'}}}
                          onPress={() => {
                            setIsFeedbackModalVisible(true)
                            storeFeedback({
                              email: session!.user!.email,
                              was_answer_accurate: true,
                              question,
                              answer: LLMResponse,
                              // @ts-ignore
                            }, session!.accessToken)
                          }}
                  >
                      Answer was accurate
                  </Button>
                  <Button ghost auto size="lg" iconRight="👎"
                          onPress={() => {
                            setIsFeedbackModalVisible(true)
                            storeFeedback({
                              email: session!.user!.email,
                              was_answer_accurate: false,
                              question,
                              answer: LLMResponse,
                              // @ts-ignore
                            }, session!.accessToken)
                          }}
                  >
                      Answer was inaccurate
                  </Button>
              </Flex>
            {isFeedbackModalVisible &&
                <FeedbackModal paper={selectedPaper}
                               question={question!}
                               answer={LLMResponse}
                               userEmail={session!.user!.email!}
                               visible={isFeedbackModalVisible}
                               setVisible={setIsFeedbackModalVisible}
                />
            }
              <Spacer y={4}/>
          </>
      }
    </>}
  </Layout>
    ;
};

function fixNewlines(text: string) {
  return text.replace(/\\n/g, '\n').replace(/  /g, '')
}

function makeLinksClickable(text: string) {
  return text.replace(/(https?:\/\/[^\s]+)/g, "<a target=\"__blank\" href='$1'>$1</a>");
}

export default Home;