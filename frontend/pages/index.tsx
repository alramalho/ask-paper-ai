import { Badge, Loading, Spacer, Switch, Text, Textarea, useInput, Image, Divider, Card, Grid } from "@nextui-org/react";
import React, { useContext, useEffect, useRef, useState } from "react";
import MarkdownView from "react-showdown";
import { Box, FeedbackVisibleContext, headerHeight, isMobile, } from "../components/layout";
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
import { Breadcrumb, Button, Collapse, Layout, Space, Input } from 'antd';
import type { MenuProps } from 'antd';
import { ClearOutlined, DotChartOutlined, FileTextTwoTone, HighlightOutlined, HighlightTwoTone, SendOutlined } from "@ant-design/icons";
import { get } from "http";
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
  const [question, setQuestion] = useState('');
  const [activePanelKeys, setActivePanelKeys] = useState<string[] | string | undefined>(undefined);

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

  function addChatMessage(text: string, sender: ChatMessage['sender']) {
    setChatHistory(prev => [...prev, { text: text, sender: sender }]);
  }
  function getChatHistory(): string[] {
    const messages = chatHistory;

    let lastSystemIndex = -1;

    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === "system") {
        lastSystemIndex = i;
        break;
      }
    }

    if (lastSystemIndex === -1 || lastSystemIndex === messages.length - 1) {
      // No system messages found or the last message is a system message
      return [];
    }

    const messagesAfterLastSystem = messages.slice(lastSystemIndex + 1);

    return messagesAfterLastSystem.filter(message => message.sender === "user" || message.sender === "llm").map(message => (message.sender + ": " + message.text));
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
    setActivePanelKeys(undefined)

    func(...args)
      .then(res => {
        addChatMessage(makeLinksClickable(fixNewlines(res.data.message)), "llm")
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
    {(!isMobile() || selectedPaper === undefined) &&
      <Content style={{ backgroundColor: "transparent" }}>
        <Spacer y={2} />
        <PaperUploader onFinish={(paper, pdf) => {
          setSelectedPaper(paper)
          setPdf(pdf)
          addChatMessage(`Now reading "${paper.title}"`, "system")
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
        maxHeight: 'calc(100vh - ' + headerHeight + 'px)',
        position: "sticky",
        top: `${headerHeight}px`,
        right: "0",
        bottom: "0",
        padding: "1rem",
        border: "1px solid gainsboro",
      }} theme="light">
        <Flex direction="column" css={{
          height: "100%",
          flexWrap: 'nowrap'
        }}>
          <Chat data-testid="chat" chatHistory={chatHistory} setChatHistory={setChatHistory} selectedPaper={selectedPaper} />

          {(messageStatus === 'loading' || messageStatus === 'error') &&
            <Flex css={{ flexShrink: 1, alignContent: 'end' }}>
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
          }

          <div style={{ position: 'relative', width: "100%", padding: "0.85rem", borderTop: "1px solid rgba(0, 0, 0, 0.15)" }}>
            <Button
              size="large"
              shape="circle"
              data-testid="clear-button"
              icon={<ClearOutlined />}
              style={{ position: 'absolute', right: '0.85rem', top: '-3rem', zIndex: 1 }}
              onClick={() => {
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
                handleSubmit(askPaper, {
                  question: question ?? '',
                  history: getChatHistory().slice(-6),
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
                addChatMessage(question ?? '', "user")
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
                    handleSubmit(extractDatasets, {
                      paper: JSON.parse(JSON.stringify(selectedPaper)),
                      // @ts-ignore
                      email: session!.user!.email,
                      // @ts-ignore
                      accessToken: session!.accessToken,
                      resultsSpeedTradeoff: resultsSpeedTradeoff
                    })
                    addChatMessage("Predefined Action: Extract Datasets", "user")
                  }}
                  icon={<DotChartOutlined />}
                >Extract datasets</Button>
                <Button
                  onClick={() => {
                    handleSubmit(generateSummary, {
                      paper: JSON.parse(JSON.stringify(selectedPaper)),
                      // @ts-ignore
                      email: session!.user!.email,
                      // @ts-ignore
                      accessToken: session!.accessToken
                    })
                    addChatMessage("Predefined Action: Generate Summary", "user")
                  }}
                  icon={<FileTextTwoTone />}
                >Generate Summary
                </Button>
                <Button
                  onClick={() => {
                    handleSubmit(explainSelectedText, {
                      text: selectedText,
                      paper: JSON.parse(JSON.stringify(selectedPaper)),
                      // @ts-ignore
                      email: session!.user!.email,
                      // @ts-ignore
                      accessToken: session!.accessToken,
                    })
                    addChatMessage("Predefined Action: Explain selected text \"" + selectedText + "\"", "user")
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