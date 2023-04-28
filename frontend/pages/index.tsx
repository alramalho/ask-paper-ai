import { Badge, Loading, Spacer, Switch, Text, Textarea, useInput, Image, Divider, Card, Grid } from "@nextui-org/react";
import React, { useContext, useEffect, useState } from "react";
import MarkdownView from "react-showdown";
import { Box, FeedbackVisibleContext } from "../components/layout";
import { Flex } from "../components/styles/flex";
import PaperUploader from "../components/paper-uploader";
import { GuestUserContext, useGuestSession } from "../hooks/session";
import dynamic from "next/dynamic";
import { askPaper, explainSelectedText, extractDatasets, generateSummary, getRemainingRequestsFor, sendAnswerEmail } from "../service/service";
import RemainingRequests from "../components/remaining-requests";
import { AxiosResponse } from "axios";
import IconSlider from "../components/slider/slider";
import { useSession } from "next-auth/react";
import Chat, { ChatMessage } from "../components/chat/chat";
import Info from "../components/info";
import { Breadcrumb, Button, Collapse, Layout, Space } from 'antd';
import type { MenuProps } from 'antd';
import { DotChartOutlined, FileTextTwoTone, HighlightOutlined } from "@ant-design/icons";
const { Header, Sider, Content, Footer } = Layout;
type MenuItem = Required<MenuProps>['items'][number];

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
  const setIsFeedbackModalVisible = useContext(FeedbackVisibleContext)
  const [resultsSpeedTradeoff, setResultsSpeedTradeoff] = useState<number>(0)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [selectedText, setSelectedText] = useState('');


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

  const handleSelection = () => {
    let selectedText = '';
    if (window.getSelection) {
      //@ts-ignore
      selectedText = window.getSelection().toString();
      //@ts-ignore
    } else if (document.selection && document.selection.type != "Control") {
      //@ts-ignore
      selectedText = document.selection.createRange().text;
    }
    setSelectedText(selectedText);
  };


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
        <RemainingRequests value={remainingTrialRequests} />
      </>)
  }

  return (<>
    <Content >
      <PaperUploader onFinish={(paper, pdf) => {
        setSelectedPaper(paper)
        setPdf(pdf)
        addUserChatMessage(`Now reading "${paper.title}"`)
      }} />
      {isUserLoggedInAsGuest &&
        <>
          <RemainingRequests value={remainingTrialRequests} />
        </>
      }
      {selectedPaper &&
        <>
          <Spacer y={4} />
          {/* <Flex direction='row' css={{ margin: '$10', gap: '$10', flexWrap: 'wrap', '@sm': { flexWrap: 'nowrap' } }}> */}
          {pdf && <PdfViewer pdf={pdf} />}
          {/* </Flex> */}
        </>
      }
    </Content >
    {/* {selectedPaper &&
      <Sider theme="light">
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

          <Divider css={{ margin: '$5 0 0 0' }} />

          <Card.Footer css={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'start',
            flexShrink: 0,
            bg: 'rgba(255,255,255,0.86)',
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
                onClick={() => {
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
            <Info text={"The chat interface does not support referencing to older messages yet! We are working on it :)"} css={{ justifyContent: 'flex-start', width: '100%' }} />
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
                    onClick={() => {
                      handleSubmit(extractDatasets, {
                        paper: JSON.parse(JSON.stringify(selectedPaper)),
                        // @ts-ignore
                        email: session!.user!.email,
                        // @ts-ignore
                        accessToken: session!.accessToken,
                        resultsSpeedTradeoff: resultsSpeedTradeoff
                      })
                      addUserChatMessage("Predefined Action: Extract Datasets")
                    }}
                    icon={<DotChartOutlined />}
                  >
                    <Text>Extract datasets</Text>
                  </Button>
                  <Button
                    onClick={() => {
                      handleSubmit(generateSummary, {
                        paper: JSON.parse(JSON.stringify(selectedPaper)),
                        // @ts-ignore
                        email: session!.user!.email,
                        // @ts-ignore
                        accessToken: session!.accessToken
                      })
                      addUserChatMessage("Predefined Action: Generate Summary")
                    }}
                    icon={<FileTextTwoTone />}
                  >
                    <p>Generate Summary</p>
                  </Button>
                  <Button
                    onClick={() => {
                      handleSubmit(explainSelectedText, {
                        text: selectedText,
                        // @ts-ignore
                        email: session!.user!.email,
                        // @ts-ignore
                        accessToken: session!.accessToken,
                      })
                      addUserChatMessage("Predefined Action: Explain selected text \"" + selectedText + "\"")
                    }}
                    icon={<HighlightOutlined twoToneColor="#FFC400" />}
                  >
                    <p>Explain selected text</p>
                  </Button>
                  <Button
                    onClick={() => {
                      setIsFeedbackModalVisible(true)
                    }}
                  >
                    <p> 🚀✨ Decide what goes here</p>
                  </Button>
                </Flex>
              </Panel>
            </Collapse>
            <Spacer y={1} />
          </Card.Footer>
        </Card>
      </Sider>
    } */}
    <Box onMouseUp={handleSelection} css={{
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
    </Box>

  </>
  )
};

function fixNewlines(text: string) {
  return text.replace(/\\n/g, '\n').replace(/  /g, '')
}

export function makeLinksClickable(text: string) {
  return text.replace(/(https?:\/\/[^\s]+)/g, "<a target=\"__blank\" href='$1'>link</a>");
}

export default Home;