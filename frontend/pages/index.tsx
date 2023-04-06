import { Badge, Button, Loading, Spacer, Switch, Text, Textarea, useInput, Image, Divider, Card, Grid } from "@nextui-org/react";
import React, { useContext, useEffect, useState } from "react";
import MarkdownView from "react-showdown";
import SendIcon from "../components/icons/send-icon";
import { Box } from "../components/layout";
import { Flex } from "../components/styles/flex";
import PaperUploader from "../components/paper-uploader";
import FeedbackModal, { storeFeedback } from "../components/feedback-modal";
import { GuestUserContext, useGuestSession } from "../hooks/session";
import dynamic from "next/dynamic";
import { askPaper, extractDatasets, generateSummary, getRemainingRequestsFor, sendAnswerEmail } from "../service/service";
import ProfileInfo from "../components/profile-info";
import RemainingRequests from "../components/remaining-requests";
import { AxiosResponse } from "axios";
import IconSlider from "../components/slider/slider";
import { useSession } from "next-auth/react";
import Chat, { ChatMessage } from "../components/chat/chat";
import LLMResponse, { RobotAnswer } from "../components/chat/llm-response";
import Info from "../components/info";
import { Collapse } from 'antd';

const { Panel } = Collapse;


const PdfViewer = dynamic(
  // @ts-ignore
  () => import('../components/pdf-viewer'),
  { ssr: false }
);

export type Paper = {
  hash: string
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

export type Status = 'idle' | 'loading' | 'success' | 'error'

const Home = () => {
  const [messageStatus, setMessageStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const [loadingText, setLoadingText] = useState<string | undefined>(undefined)
  const [quoteChecked, setQuoteChecked] = useState<boolean>(true)
  const [selectedPaper, setSelectedPaper] = useState<Paper | undefined | null>(undefined)
  const { isUserLoggedInAsGuest, remainingTrialRequests, setRemainingTrialRequests } = useContext(GuestUserContext)
  const { data: session } = isUserLoggedInAsGuest ? useGuestSession() : useSession()
  const [pdf, setPdf] = useState<File | undefined>(undefined);
  const [isFeedbackModalVisible, setIsFeedbackModalVisible] = useState<boolean>(false)
  const [resultsSpeedTradeoff, setResultsSpeedTradeoff] = useState<number>(4)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const {
    value: question,
    setValue: setQuestion,
    reset: resetQuestion,
    bindings,
  } = useInput("");

  useEffect(() => {
    if (messageStatus == 'loading') {
      if (document.getElementById('loading-answer')) {
        // @ts-ignore
        document.getElementById('loading-answer').scrollIntoView()
      }
    }
    if (messageStatus !== 'loading' && messageStatus !== 'idle') {
      if (document.getElementById('answer-area')) {
        // @ts-ignore
        document.getElementById('answer-area').scrollIntoView()
      }
    }
  }, [messageStatus])

  useEffect(() => {
    if (chatHistory.length > 0) {
      const chatElement = document.getElementById('chat')
      if (chatElement) {
        chatElement.scrollTop = chatElement.scrollHeight
        chatElement.scrollLeft = 0
      }
    }
  }, [chatHistory])

  function addUserChatMessage(text: string) {
    setChatHistory(prev => [...prev, { text: text, sender: "user" }]);
  }


  function handleSubmit<T extends any[], R>(func: (...args: T) => Promise<AxiosResponse<any, any>>, ...args: T) {
    setMessageStatus('loading')
    setLoadingText("Reading paper...")

    func(...args)
      .then(res => {
        setChatHistory(prev => [...prev, { text: makeLinksClickable(fixNewlines(res.data.message)), sender: "llm" }]);
        if (isUserLoggedInAsGuest && setRemainingTrialRequests != undefined && session!.user!.email !== null && session!.user!.email !== undefined) {
          getRemainingRequestsFor(session!.user!.email).then(res => {
            setRemainingTrialRequests(res.data.remaining_trial_requests)
          })
        }
        setMessageStatus('success')
      })
      .catch(error => {
        if (error.response) {
          setErrorMessage("Something went wrong with server's response...</br>Details: " + error.response.data.detail)
        } else {
          setErrorMessage("Something went wrong...</br>Technical Details: " + error.message)
        }
        console.error(error)
        setMessageStatus('error')
      })
  }

  if (isUserLoggedInAsGuest && remainingTrialRequests !== undefined && remainingTrialRequests <= 0) {
    return (
      <>
        <ProfileInfo name={session!.user!.email} imageURL={session!.user!.image} />
        <RemainingRequests value={remainingTrialRequests} />
      </>)
  }
  return (<>
    <Box css={{
      display: 'flex',
      overflow: 'auto',
      flexDirection: 'column',
      height: '100%',
      '@md': {
        flexWrap: 'nowrap',
        overflow: 'hidden',
        flexDirection: 'row',
      }
    }}>
      <Box as="main" css={{
        overflow: 'auto',
        paddingRight: "$10",
        maxHeight: '50%',
        resize: 'vertical',
        '@md': {
          maxHeight: '100%',
        }
      }}>
        <Flex css={{ flexWrap: 'nowrap', flexDirection: "column" }}>
          <Box>
            <Spacer y={3} />
            <Image src="hippo.svg" css={{ width: "100px", margin: '0 auto' }} />
            <Flex>
              <Text h2>Ask Paper</Text>
              <Badge color="error" variant="flat">
                BETA
              </Badge>
              <Badge color="warning" variant="flat">
                v2.2
              </Badge>
            </Flex>
            <PaperUploader onFinish={(paper, pdf) => {
              setSelectedPaper(paper)
              setPdf(pdf)
              addUserChatMessage(`Now reading "${paper.title}"`)
            }} />
          </Box>
          {isUserLoggedInAsGuest &&
            <>
              <ProfileInfo name={session!.user!.email} imageURL={session!.user!.image} />
              <RemainingRequests value={remainingTrialRequests} />
            </>
          }
          {selectedPaper &&
            <>
              <Spacer y={4} />
              <Flex direction='row' css={{ margin: '$10', gap: '$10', flexWrap: 'wrap', '@sm': { flexWrap: 'nowrap' } }}>
                {pdf && <PdfViewer pdf={pdf} />}
              </Flex>
            </>
          }
        </Flex>
      </Box>
      {selectedPaper &&
        <Card as="aside" css={{
          background: "rgba(0,0,0,.03)",
          backdropFilter: "blur(3px)",
          textAlign: 'left',
          border: "1px solid gray",
          borderRadius: '0',
          overflow: 'hidden',
          flex: '1 0 10%',
          boxShadow: 'rgba(100, 100, 111, 0.4) 0px 7px 29px 0px',
          '@md': {
            height: '100%',
          },
        }}>
          <Chat data-testid="chat" chatHistory={chatHistory} selectedPaper={selectedPaper} />
          <Flex css={{ flexGrow: 1, alignContent: 'end' }}>
            {messageStatus === 'loading' &&
              <>
                <Loading data-testid="loading-answer">{loadingText}</Loading>
              </>
            }
            {messageStatus === 'error' &&
              <Info>
                <MarkdownView
                  markdown={errorMessage + "<br/> Please try again later or contact support."}
                  options={{ tables: true, emoji: true, }}
                />
              </Info>
            }
          </Flex>

          <Divider css={{ margin: '$5 0' }} />

          <Card.Footer css={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'start',
            flexShrink: 0,
          }}>
            <Flex direction="row" css={{ gap: "$2", flexWrap: 'nowrap', width: '100%' }}>
              <Textarea
                {...bindings}
                bordered
                data-testid="ask-textarea"
                fullWidth
                size="lg"
                minRows={2}
                maxRows={20}
                placeholder="Type your question here..."
                // @ts-ignore
                css={{ marginBottom: "$5", background: '$backgroundLighter', margin: 0 }}
              />
              <Button
                data-testid="ask-button"
                iconRight={<SendIcon />}
                auto
                css={{ height: "100%" }}
                onPress={() => {
                  handleSubmit(askPaper, {
                    question: question ?? '',
                    paper: JSON.parse(JSON.stringify(selectedPaper)),
                    // @ts-ignore
                    email: session!.user!.email,
                    // @ts-ignore
                    accessToken: session!.accessToken,
                    quote: quoteChecked,
                    // @ts-ignore
                    paperHash: selectedPaper!.hash,
                    resultsSpeedTradeoff: resultsSpeedTradeoff
                  })
                  addUserChatMessage(question ?? '')
                }
                }> Ask </Button>
            </Flex>
            <Info text={"The chat interface does not support referencing to older messages yet! We are working on it :)"} />
            <Collapse size="small" style={{ width: "100%" }} defaultActiveKey={['2']}>
              <Panel data-testid="configuration-panel" header="🛠 Configuration" key="1">
                <Flex css={{ gap: "$2", justifyContent: 'flex-start' }}>
                  <Switch bordered initialChecked checked={quoteChecked}
                    onChange={() => setQuoteChecked(previous => !previous)}></Switch>
                  <Text small>Quote paper</Text>
                </Flex>
                <Spacer y={1} />
                <IconSlider min={0} max={4} onChange={setResultsSpeedTradeoff} value={resultsSpeedTradeoff} />
              </Panel>
              <Panel header="📦 Or start with predefined action" key="2" >
                <Flex css={{ gap: '$7', justifyContent: "flex-start" }}>
                  <Button
                    size="sm"
                    css={{ backgroundColor: "$blue200", color: "black" }}
                    onPress={() => {
                      handleSubmit(extractDatasets, {
                        paper: JSON.parse(JSON.stringify(selectedPaper)),
                        // @ts-ignore
                        email: session!.user!.email,
                        // @ts-ignore
                        accessToken: session!.accessToken,
                        resultsSpeedTradeoff: resultsSpeedTradeoff
                      })
                      setQuestion("Extract Datasets")
                      addUserChatMessage("Predefined Action: Extract Datasets")
                    }}
                  >
                    <Text>Extract datasets</Text>
                  </Button>
                  <Button
                    size="sm"
                    css={{ backgroundColor: "$green200", color: "black" }}
                    onPress={() => {
                      handleSubmit(generateSummary, {
                        paper: JSON.parse(JSON.stringify(selectedPaper)),
                        // @ts-ignore
                        email: session!.user!.email,
                        // @ts-ignore
                        accessToken: session!.accessToken
                      })
                      setQuestion("Generate Summary")
                      addUserChatMessage("Predefined Action: Generate Summary")
                    }}
                  >
                    <Text>Generate Summary</Text>
                  </Button>
                  <Button
                    size="sm"
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
              </Panel>
            </Collapse>
            <Spacer y={1} />
          </Card.Footer>
        </Card>
      }
    </Box>

    {isFeedbackModalVisible &&
      <FeedbackModal paper={selectedPaper ?? null}
        question={question ?? null}
        answer={chatHistory[chatHistory.length - 1].text ?? null}
        userEmail={session!.user!.email!}
        visible={isFeedbackModalVisible}
        setVisible={setIsFeedbackModalVisible}
      />
    }

    <Box data-testid='feedback-component' css={{
      position: 'absolute',
      bottom: '0',
      right: '10px',
      padding: '$4',
      backgroundColor: '$primary',
      border: "1px solid $primaryLightContrast",
      zIndex: 50,
      color: 'white',
      borderRadius: '15px 15px 0 0',
      cursor: 'pointer',
    }} onClick={() => setIsFeedbackModalVisible(true)}>
      <Text b css={{ color: 'inherit' }}>👋 Feedback?</Text>
    </Box>
  </>
  )
};

function fixNewlines(text: string) {
  return text.replace(/\\n/g, '\n').replace(/  /g, '')
}

function makeLinksClickable(text: string) {
  return text.replace(/(https?:\/\/[^\s]+)/g, "<a target=\"__blank\" href='$1'>link</a>");
}

export default Home;