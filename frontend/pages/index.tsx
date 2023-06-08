import { Badge, Loading, Spacer, Switch, Text, Textarea, useInput, Image, Divider, Card, Grid } from "@nextui-org/react";
import React, { useContext, useEffect, useRef, useState } from "react";
import MarkdownView from "react-showdown";
import { Box, FeedbackVisibleContext, headerHeight, isMobile, } from "../components/layout";
import { Flex } from "../components/styles/flex";
import PaperUploader from "../components/paper-uploader";
import { GuestUserContext, useGuestSession } from "../hooks/session";
import dynamic from "next/dynamic";
import { askPaper, explainSelectedText, extractDatasets, generateSummary, getRemainingRequestsFor, sendAnswerEmail, updateDatasets } from "../service/service";
import RemainingRequests from "../components/remaining-requests";
import { AxiosResponse } from "axios";
import IconSlider from "../components/slider/slider";
import { useSession } from "next-auth/react";
import Chat, { ChatMessage } from "../components/chat/chat";
import Info from "../components/info";
import { Breadcrumb, Button, Collapse, Layout, Space, Input, notification } from 'antd';
import type { MenuProps } from 'antd';
import { BorderOutlined, ClearOutlined, DotChartOutlined, FileTextTwoTone, HighlightOutlined, HighlightTwoTone, SendOutlined, StopOutlined } from "@ant-design/icons";
import { create } from "domain";
const { Header, Sider, Content, Footer } = Layout;
const { TextArea } = Input;
type MenuItem = Required<MenuProps>['items'][number];

const { Panel } = Collapse;

const PdfViewer = dynamic(
  // @ts-ignore
  () => import('../components/pdf-viewer'),
  { ssr: false }
);

type Author = {
  first: string
  middle: string[]
  last: string
  suffix: string
  affiliation: {
    laboratory: string
    institution: string
    location: {
      settlement: string
      country: string
    }
  }
  email: string
}


export type Paper = {
  hash: string
  abstract: string
  title: string
  authors: Author[]
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
  const [infoMessage, setInfoMessage] = useState<string | undefined>(undefined)
  const [quoteChecked, setQuoteChecked] = useState<boolean>(true)
  const [selectedPaper, setSelectedPaper] = useState<Paper | undefined | null>(undefined)
  const { isUserLoggedInAsGuest, remainingTrialRequests, setRemainingTrialRequests } = useContext(GuestUserContext)
  const { data: session } = isUserLoggedInAsGuest ? useGuestSession() : useSession()
  const [pdf, setPdf] = useState<File | undefined>(undefined);
  const setIsFeedbackModalVisible = useContext(FeedbackVisibleContext)
  const [resultsSpeedTradeoff, setResultsSpeedTradeoff] = useState<number>(0)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [selectedText, setSelectedText] = useState('');
  const [question, setQuestion] = useState('');
  const [activePanelKeys, setActivePanelKeys] = useState<string[] | string | undefined>(undefined);
  const [streaming, setStreaming] = useState<boolean>(false)
  const [requestControllers, setRequestControllers] = useState<AbortController[]>([])
  const [notificationApi, contextHolder] = notification.useNotification();


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


  function updateRemainingRequests() {
    if (isUserLoggedInAsGuest) {
      getRemainingRequestsFor(session!.user!.email!).then((response: AxiosResponse) => {
        if (response.data.remaining_trial_requests !== undefined && setRemainingTrialRequests !== undefined) {
          setRemainingTrialRequests(response.data.remaining_trial_requests)
        } else {
          console.log("Error while updating remaining requests. Response:")
          console.log(response)
        }
      }
      ).catch((error) => {
        console.log(error)
      }
      )
    }
  }



  function addChatMessage(text: string, sender: ChatMessage['sender']) {
    setChatHistory(prev => [...prev, { text: text, sender: sender }]);
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


  function createAbortController() {
    const abortController = new AbortController();
    setRequestControllers(prev => [...prev, abortController])
    return abortController
  }

  function cancelAllRequests() {
    requestControllers.forEach(controller => controller.abort())
    setRequestControllers([])
  }

  useEffect(() => { console.log(messageStatus) }, [messageStatus])

  function handleMessage<T extends any[], R>(
    func: (...args: T) => Promise<Response>,
    initializationCallback: () => void,
    ...args: T
  ) {
    if (messageStatus !== 'loading') {
      setMessageStatus('loading')
      setInfoMessage(undefined)
      setActivePanelKeys(undefined)
      initializationCallback()

      func(...args)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Response status ${response.status}: ${response.statusText}`);
          }
          const reader = response!.body!.getReader();
          let messageCreated = false

          function readStream() {
            setStreaming(true)
            return reader.read().then(({ done, value }) => {
              if (done) {
                setMessageStatus('success')
                setStreaming(false)
                updateRemainingRequests()
                return;
              }

              const chunk: string = new TextDecoder().decode(value);
              if (!messageCreated) {
                addChatMessage(chunk, "llm")
                messageCreated = true
              } else {
                setChatHistory(prev => [...prev.slice(0, -1), { text: prev[prev.length - 1].text + chunk, sender: "llm" }])
              }

              // Continue reading the stream
              return readStream();
            });
          }

          return readStream();
        })
        .catch(error => {
          setStreaming(false)
          if (error.response) {
            setInfoMessage("Something went wrong with server's response...</br>Details: " + error.response.data.detail + "<br/> Please try again later or contact support")
          } else {
            setInfoMessage("Something went wrong...</br>Technical Details: " + error.message + "<br/> Please try again later or contact support")
          }
          console.error(error)
          setMessageStatus('error')
        })
    } else {
      notificationApi['info']({
        message: "Please wait until the current request is finished.",
      });
    }
  }

  if (isUserLoggedInAsGuest && remainingTrialRequests !== undefined && remainingTrialRequests <= 0) {
    return (
      <>
        <RemainingRequests value={remainingTrialRequests} />
      </>)
  }

  return (<>
    {contextHolder}
    {(!isMobile() || selectedPaper === undefined) &&
      <Content style={{ backgroundColor: "transparent" }}>
        <Spacer y={2} />
        <PaperUploader onFinish={(paper, pdf) => {
          setSelectedPaper(paper)
          setPdf(pdf)
          setChatHistory([{ text: `Now reading "${paper.title}"`, sender: "system" } as ChatMessage])
        }} />
        {isUserLoggedInAsGuest &&
          <>
            <RemainingRequests value={remainingTrialRequests} />
          </>
        }
        {selectedPaper &&
          <>
            <Spacer y={4} />
            {pdf && <PdfViewer pdf={pdf} onMouseUp={handleSelection} />}
          </>
        }
      </Content >
    }
    {selectedPaper &&
      <Sider width={isMobile() ? "100%" : "50%"} style={{
        overflow: "auto",
        height: '100vh',
        position: "sticky",
        top: 0,
        right: "0",
        bottom: "0",
        padding: "1rem",
        border: "1px solid gainsboro",
      }} theme="light">
        <Flex direction="column" css={{
          height: "100%",
          flexWrap: 'nowrap'
        }}>
          <Chat data-testid="chat" chatHistory={chatHistory} setChatHistory={setChatHistory} selectedPaper={selectedPaper} messageStatus={messageStatus} />

          <Flex css={{ flexShrink: 1, alignContent: 'end' }}>
            {messageStatus === 'loading' &&
              <>
                <Loading data-testid="loading-answer">Reading paper...</Loading>
                <Button
                  size="large"
                  shape="circle"
                  data-testid="stop-button"
                  icon={<BorderOutlined />}
                  onClick={() => {
                    cancelAllRequests()
                  }} />
              </>
            }
            {infoMessage &&
              <Info data-testid="info">
                <MarkdownView
                  markdown={infoMessage}
                  options={{ tables: true, emoji: true, }}
                />
              </Info>
            }
          </Flex>

          <div style={{ position: 'relative', width: "100%", padding: "0.85rem", borderTop: "1px solid rgba(0, 0, 0, 0.15)" }}>
            <Button
              size="large"
              shape="circle"
              data-testid="clear-button"
              icon={<ClearOutlined />}
              style={{ position: 'absolute', right: '0.85rem', top: '-3rem', zIndex: 1 }}
              onClick={() => {
                cancelAllRequests()
                setChatHistory(previous => previous.filter((e: any) => e.sender == "system"))
              }
              } />
            <TextArea
              data-testid="ask-textarea"
              placeholder="Write your question here..."
              autoSize={{ minRows: 3, maxRows: 5 }}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              style={{ paddingRight: "40px" }}
            />
            <Button
              size="large"
              shape="circle"
              type="text"
              data-testid="ask-button"
              icon={<SendOutlined />}
              style={{ position: 'absolute', right: '0.85rem', bottom: '0.85rem' }}
              onClick={() => {
                if (!streaming) {
                  handleMessage(askPaper, () => addChatMessage(question ?? '', "user"), {
                    question: question ?? '',
                    history: chatHistory.filter(message => message.sender != 'system').slice(-6),
                    paper: JSON.parse(JSON.stringify(selectedPaper)),
                    // @ts-ignore
                    email: session!.user!.email,
                    // @ts-ignore
                    accessToken: session!.accessToken,
                    quote: quoteChecked,
                    // @ts-ignore
                    paperHash: selectedPaper!.hash,
                    resultsSpeedTradeoff: resultsSpeedTradeoff
                  }, {
                    signal: createAbortController().signal,
                  })
                }
              }
              } />
          </div>

          <Collapse size="small" style={{ width: "100%" }} activeKey={activePanelKeys} onChange={key => setActivePanelKeys(key)}>
            <Panel data-testid="configuration-panel" header="🛠 Configuration" key="1">
              <Flex css={{ gap: "$2", justifyContent: 'flex-start' }}>
                <Switch bordered initialChecked checked={quoteChecked}
                  onChange={() => setQuoteChecked(previous => !previous)}></Switch>
                <Text small>Quote paper</Text>
              </Flex>
              <Spacer y={1} />
              <IconSlider min={0} max={4} onChange={setResultsSpeedTradeoff} value={resultsSpeedTradeoff} />
            </Panel>
            <Panel data-testid="predefined-actions-panel" header="📦 Predefined actions" key="2" >
              <Flex css={{ gap: '$7', justifyContent: "flex-start" }}>
                <Button
                  onClick={() => {
                    if (!streaming) {
                      handleMessage(extractDatasets, () => addChatMessage("Predefined Action: Extract Datasets", "user"),
                        {
                          paper: JSON.parse(JSON.stringify(selectedPaper)),
                          history: chatHistory.filter(message => message.sender != 'system').slice(-6),
                          // @ts-ignore
                          email: session!.user!.email,
                          // @ts-ignore
                          accessToken: session!.accessToken,
                          resultsSpeedTradeoff: resultsSpeedTradeoff
                        },
                        {
                          signal: createAbortController().signal,
                        })
                    }
                  }}
                  icon={<DotChartOutlined />}
                >Extract datasets</Button>
                <Button
                  onClick={() => {
                    if (!streaming) {
                      handleMessage(generateSummary,
                        () => addChatMessage("Predefined Action: Generate Summary", "user"),
                        {
                          paper: JSON.parse(JSON.stringify(selectedPaper)),
                          // @ts-ignore
                          email: session!.user!.email,
                          // @ts-ignore
                          accessToken: session!.accessToken
                        },
                        {
                          signal: createAbortController().signal,
                        })
                    }
                  }}
                  icon={<FileTextTwoTone />}
                >Generate Summary
                </Button>
                <Button
                  onClick={() => {
                    if (!streaming) {
                      handleMessage(explainSelectedText,
                        () => addChatMessage("Predefined Action: Explain selected text \"" + selectedText + "\"", "user"),
                        {
                          text: selectedText,
                          history: chatHistory.filter(message => message.sender != 'system').slice(-6),
                          paper: JSON.parse(JSON.stringify(selectedPaper)),
                          // @ts-ignore
                          email: session!.user!.email,
                          // @ts-ignore
                          accessToken: session!.accessToken,
                        }, {
                        signal: createAbortController().signal,
                      })

                    }
                  }}
                  icon={<HighlightTwoTone twoToneColor="#FFC400" />}
                >Explain selected text
                </Button>
                <Button
                  type="dashed"
                  onClick={() => {
                    setIsFeedbackModalVisible(true)
                  }}
                >🚀 Decide what goes here
                </Button>
              </Flex>
            </Panel>
            {isMobile() &&
              <Panel header="⬆️ Upload another paper" key="3">
                <PaperUploader alternative onFinish={(paper, pdf) => {
                  setSelectedPaper(paper)
                  setPdf(pdf)
                  addChatMessage(`Now reading "${paper.title}"`, "system")
                }} />
              </Panel>
            }
          </Collapse>
          <Spacer y={1} />
        </Flex>
      </Sider>
    }

  </>
  )
};

function fixNewlines(text: string) {
  return text.replace(/\\n/g, '\n').replace(/  /g, '')
}

export function makeLinksClickable(text: string) {
  return text.replace(/(https?:\/\/[^\s]+)/g, "<a target=\"__blank\" href='$1'>$1</a>");
}

export default Home;