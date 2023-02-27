import { Badge, Button, Loading, Spacer, Switch, Text, Textarea, useInput, Image } from "@nextui-org/react";
import React, { useEffect, useState } from "react";
import MarkdownView from "react-showdown";
import SendIcon from "../components/icons/send-icon";
import { Box, Layout } from "../components/layout";
import { Flex } from "../components/styles/flex";
import PaperUploader from "../components/paper-uploader";
import FeedbackModal, { storeFeedback } from "../components/feedback-modal";
import useCustomSession from "../hooks/session";
import axios from "axios";

export type Paper = {
  id: string
  abstract: string
  title: string
  pdf_parse: {
    body_text: {
      text: string
      section: string
      sec_num: string | null
    }[],
    back_matter: {
      text: string
      section: string
      sec_num: string | null
    }[]
  }
}

const Home = () => {
  const [LLMResponse, setLLMResponse] = useState<string | undefined>(undefined)
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [loadingText, setLoadingText] = useState<string | undefined>(undefined)
  const [underFeedbackText, setUnderFeedbackText] = useState<string | undefined>(undefined)
  const [quoteChecked, setQuoteChecked] = useState<boolean>(true)
  const [selectedPaper, setSelectedPaper] = useState<Paper | undefined | null>(undefined)
  const [question, setQuestion] = useState<string | undefined>(undefined)
  const { data: session } = useCustomSession()
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


  const handleSubmit = (
    paper: Paper,
    question: string,
    quote: boolean = false,
    sectionFilterer: (sectionName: string) => boolean = (sectionName: string) => true,
    onFinish: () => void = () => { }
  ) => {
    setIsRunning(true)
    setLoadingText("Reading paper...")
    setQuestion(question)

    const paperDeepCopy = JSON.parse(JSON.stringify(paper))

    let isBodyTextEmptyAfterFiltering = !(paperDeepCopy.pdf_parse.body_text.find((e) => sectionFilterer(e.section)));
    let isBackMattertEmptyAfterFiltering = !(paperDeepCopy.pdf_parse.back_matter.find((e) => sectionFilterer(e.section)));
    if (!isBodyTextEmptyAfterFiltering || !isBackMattertEmptyAfterFiltering) {
      paperDeepCopy.pdf_parse.body_text = paperDeepCopy.pdf_parse.body_text.filter((e) => sectionFilterer(e.section))
      paperDeepCopy.pdf_parse.back_matter = paperDeepCopy.pdf_parse.back_matter.filter((e) => sectionFilterer(e.section))
      console.log("Section filterer makes sense, continuing with filtered text")
    } else {
      console.log("Section filterer doesn't make sense, continuing with unfiltered text")
    }

    askPaper(question, paperToText(paperDeepCopy), quote)
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
    return axios.post(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/ask`, {
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
      <Badge color="warning" variant="flat">
        v2.0
      </Badge>
    </Flex>
    <PaperUploader onFinish={(paper) => {
      setSelectedPaper(paper)
    }} />
    <Spacer y={3} />
    {selectedPaper && <>
      <Spacer y={3} />
      <h4>And ask your question</h4>
      <Flex css={{ gap: "$5" }}>

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
          css={{ width: "400px", maxWidth: "100%", margin: "$2", background: '$backgroundLighter' }}
        />
        <Flex direction="column" align="start" css={{ gap: "$2" }}>
          <Button
            data-testid="ask-button"
            iconRight={<SendIcon />}
            onPress={() => handleSubmit(
              selectedPaper,
              questionValue,
              quoteChecked,
              (section) => !section.toLowerCase().includes("reference") &&
                !section.toLowerCase().includes("acknowledgement") &&
                !section.toLowerCase().includes("appendi") &&
                !section.toLowerCase().includes("discussion") &&
                !section.toLowerCase().includes("declaration") &&
                !section.toLowerCase().includes("supplem")
            )}> Ask </Button>
          <Flex css={{ gap: "$2" }}>
            <Switch bordered initialChecked checked={quoteChecked}
              onChange={() => setQuoteChecked(previous => !previous)}></Switch>
            <Text small>Quote paper</Text>
          </Flex>
        </Flex>
      </Flex>
      <Spacer y={2} />
      <h4>Or start with predefined action:</h4>
      <Flex css={{ gap: '$7' }}>
        <Button
          css={{ backgroundColor: "$blue200", color: "black" }}
          onPress={() => {
            handleSubmit(
              selectedPaper,
              `Please summarize the following text on a markdown table. The text will contain possibly repeated information about the characteristics of one or more datasets. I want you to summarize the whole text into a markdown table that represents the characteristics of all the datasets. The resulting table should be easy to read and contain any information that might be useful for medical researchers thinking about using any of those datasets. Some example fields would be "Name", "Size", "Demographic information", "Origin" and "Data or code link to find more", but add as many as you think are relevant for a medical researcher. The resulting table should contain as many entries as possible but it should NOT contain any duplicates (columns with the same "Name" field) and it should NOT contain any entries where the "Name" field is not defined/unknown/ not specified.`,
              false,
              (section) => (
                section.toLowerCase().includes('data') ||
                section.toLowerCase().includes('inclusion criteria')
              )
            )
          }
          }
        >
          <Text>Extract datasets</Text>
        </Button>
        <Button
          css={{ backgroundColor: "$green200", color: "black" }}
          onPress={() => {
            handleSubmit(
              selectedPaper,
              `Please provide me a summary of the paper per section. Sections are denoted by "\\n #### {SECTION_NAME} :\\n".
                     Each section summary should be as detailed as possible. You should still contain the section headings, and assure they
                     are in the correct order.`,
              false,
              () => true,
            )
          }}
        >
          <Text>Generate Summary</Text>
        </Button>
        <Button
          css={{
            border: "2px solid $yellow400",
            backgroundColor: "$backgroundLighter",
            '&:hover': {
              backgroundColor: "$yellow400",
            }
          }}
          onPress={() => {
            setIsFeedbackModalVisible(true)
          }}
        >
          <Text>Decide what goes here 🚀✨</Text>
        </Button>
      </Flex>
      <Spacer y={4} />
      <h3>Answer:</h3>
      {isRunning
        && <>
          <Loading data-testid="loading-answer">{loadingText}</Loading>
        </>
      }
      {LLMResponse &&
        <>
          <Flex css={{ margin: '$6', gap: "$5", flexWrap: 'no-wrap' }}>
            <Box css={{ minWidth: "60px", maxWidth: "60px", alignSelf: 'end', transform: 'translateY(20px)' }}>
              <Image src="bot.png" />
            </Box>
            <Box id="answer-area" data-testid="answer-area" css={{
              textAlign: 'left',
              backgroundColor: '$backgroundLighter',
              border: '1px solid $gray600',
              padding: '$10',
              borderRadius: '20px 20px 20px 0',
              maxWidth: '1200px',
            }}>
              <MarkdownView
                markdown={LLMResponse}
                options={{ tables: true, emoji: true, }}
              />
            </Box>
          </Flex>
          <Spacer y={1} />
          <Flex css={{ gap: "$7" }}>

            <Button ghost auto color="success" size="lg" iconRight="👍"
              css={{ color: 'green', '&:hover': { color: 'white' } }}
              onPress={() => {
                storeFeedback({
                  email: session!.user!.email,
                  was_answer_accurate: true,
                  question,
                  answer: LLMResponse,
                  // @ts-ignore
                }, session!.accessToken)
                setUnderFeedbackText('Thank you! 🙏')
                setTimeout(() => setUnderFeedbackText(undefined), 4000)
              }}
            >
              Answer was accurate
            </Button>
            <Button ghost auto size="lg" iconRight="👎"
              onPress={() => {
                storeFeedback({
                  email: session!.user!.email,
                  was_answer_accurate: false,
                  question,
                  answer: LLMResponse,
                  // @ts-ignore
                }, session!.accessToken)
                setUnderFeedbackText('Thats unfortunate... Would you care to tell us more via the feedback form? 🙏' )
                setTimeout(() => setUnderFeedbackText(undefined), 8000)
              }}
            >
              Answer was inaccurate
            </Button>
          </Flex>
          <Spacer y={1} />
          {underFeedbackText && <Text css={{maxWidth: '400px'}}>{underFeedbackText}</Text>}

        </>
      }
      <Spacer y={4} />
    </>}
    {isFeedbackModalVisible &&
        <FeedbackModal paper={selectedPaper ?? null}
                       question={question ?? null}
                       answer={LLMResponse ?? null}
                       userEmail={session!.user!.email!}
                       visible={isFeedbackModalVisible}
                       setVisible={setIsFeedbackModalVisible}
        />
    }
    <Box data-testid='feedback-component' css={{
      position: 'fixed',
      bottom: '0',
      right: '10px',
      padding: '$6',
      backgroundColor: '$primary',
      zIndex: 50,
      color: 'white',
      borderRadius: '15px 15px 0 0',
      cursor: 'pointer',
    }} onClick={() => setIsFeedbackModalVisible(true)}>
      <Text b css={{color: 'inherit'}}>👋 Feedback?</Text>
    </Box>
  </Layout>
    ;
};


function paperToText(jsonObj: Paper): string {
  const result: string[] = [];

  if (jsonObj.abstract !== "") {
    result.push('#### Abstract');
    result.push(jsonObj.abstract);
  }

  for (const bodyTextEntry of (jsonObj.pdf_parse.body_text).concat(jsonObj.pdf_parse.back_matter)) {
    const secNum = bodyTextEntry.sec_num ? bodyTextEntry.sec_num : '';
    const section = "#### " + secNum + bodyTextEntry.section;

    if (!result.includes(section)) {
      result.push(section);
    }

    result.push(bodyTextEntry.text);
  }

  return result.join('\n\n');
}

function fixNewlines(text: string) {
  return text.replace(/\\n/g, '\n').replace(/  /g, '')
}

function makeLinksClickable(text: string) {
  return text.replace(/(https?:\/\/[^\s]+)/g, "<a target=\"__blank\" href='$1'>$1</a>");
}

export default Home;