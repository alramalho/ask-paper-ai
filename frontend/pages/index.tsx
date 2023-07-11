import { BorderOutlined, ClearOutlined, DotChartOutlined, EditOutlined, FileTextTwoTone, HighlightTwoTone, SendOutlined } from "@ant-design/icons";
import { Loading, Spacer } from "@nextui-org/react";
import type { MenuProps } from 'antd';
import { Button, Collapse, Input, Layout, notification } from 'antd';
import { AxiosResponse } from "axios";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { useContext, useEffect, useState } from "react";
import MarkdownView from "react-showdown";
import Chat, { ChatMessage } from "../components/chat/chat";
import CustomPromptManager from "../components/custom-prompt-manager";
import Info from "../components/info";
import { headerHeight, isMobile } from "../components/layout";
import PaperUploader from "../components/paper-uploader";
import RemainingRequests from "../components/remaining-requests";
import SectionSelector from "../components/section-selector";
import { Flex } from "../components/styles/flex";
import { GuestUserContext, useGuestSession } from "../hooks/session";
import { askPaper, getRemainingRequestsFor } from "../service/service";
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

export type CustomPrompt = {
  title: string
  prompt: string
}


const Home = () => {
  const [responseStatus, setResponseStatus] = useState<Status>('idle')
  const [infoMessage, setInfoMessage] = useState<string | undefined>(undefined)
  const [uploadedPaper, setUploadedPaper] = useState<Paper | undefined | null>(undefined)
  const [filteredPaper, setFilteredPaper] = useState<Paper | undefined>(undefined)
  const { isUserLoggedInAsGuest, remainingTrialRequests, setRemainingTrialRequests } = useContext(GuestUserContext)
  const { data: session } = isUserLoggedInAsGuest ? useGuestSession() : useSession()
  const [pdf, setPdf] = useState<File | undefined>(undefined);
  const [isCustomPromptModalVisible, setIsCustomPromptModalVisible] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [selectedText, setSelectedText] = useState('');
  const [question, setQuestion] = useState('');
  const [activePanelKeys, setActivePanelKeys] = useState<string[] | string | undefined>(undefined);
  const [requestControllers, setRequestControllers] = useState<AbortController[]>([])
  const [notificationApi, contextHolder] = notification.useNotification();
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([])


  function scrollToLastSelector(selector: string) {
    const elements = document.querySelectorAll(selector)
    if (elements.length > 0) {
      elements[elements.length - 1].scrollIntoView()
    }
  }

  useEffect(() => {
    if (chatHistory.length > 0) {
      const chatElement = document.getElementById('chat')
      if (chatElement) {
        chatElement.scrollTop = chatElement.scrollHeight
        chatElement.scrollLeft = 0
      }
    }
  }, [chatHistory])

  useEffect(() => {
    if (uploadedPaper !== null && uploadedPaper !== undefined) {
      setFilteredPaper(uploadedPaper)
    }
  }, [uploadedPaper])


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


  function handleAskButtonClick() {
    if (responseStatus !== 'loading') {
      setResponseStatus('loading')
      setInfoMessage(undefined)
      setActivePanelKeys(undefined)
      addChatMessage(question ?? '', "user")

      askPaper({
        question: question ?? '',
        paper: filteredPaper!,
        email: session!.user!.email!,
        history: chatHistory.filter(message => message.sender != 'system'),
        accessToken: session!.accessToken,
      }, {
        signal: createAbortController().signal,
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Response status ${response.status}: ${response.statusText}`);
          }
          const reader = response!.body!.getReader();
          let messageCreated = false

          function readStream() {
            return reader.read().then(({ done, value }) => {
              if (done) {
                setResponseStatus('success')
                updateRemainingRequests()
                return;
              }

              const chunk: string = new TextDecoder().decode(value);
              if (!messageCreated) {
                addChatMessage(chunk, "llm")
                messageCreated = true
                scrollToLastSelector('#answer-area')
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
          if (error.response) {
            setInfoMessage("Something went wrong with server's response...</br>Details: " + error.response.data.detail + "<br/> Please try again later or contact support")
          } else {
            setInfoMessage("Something went wrong...</br>Technical Details: " + error.message + "<br/> Please try again later or contact support")
          }
          console.error(error)
          setResponseStatus('error')
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
    {(!isMobile() || uploadedPaper === undefined) &&
      <Content style={{ backgroundColor: "transparent" }}>
        <Spacer y={2} />
        <PaperUploader onFinish={(paper, pdf) => {
          setUploadedPaper(paper)
          setPdf(pdf)
          setChatHistory([{ text: `Now reading "${paper.title}"`, sender: "system" } as ChatMessage])
        }} />
        {isUserLoggedInAsGuest &&
          <>
            <RemainingRequests value={remainingTrialRequests} />
          </>
        }
        {uploadedPaper &&
          <>
            <Spacer y={4} />
            {pdf && <PdfViewer pdf={pdf} onMouseUp={handleSelection} />}
          </>
        }
      </Content >
    }
    {uploadedPaper &&
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
          <Chat data-testid="chat" chatHistory={chatHistory} setChatHistory={setChatHistory} paper={filteredPaper!} messageStatus={responseStatus} />

          <Flex css={{ flexShrink: 1, alignContent: 'end' }}>
            {responseStatus === 'loading' &&
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
              style={{ position: 'absolute', right: '0.85rem', top: '-1rem', zIndex: 10 }}
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
              style={{ position: 'absolute', right: '1.7rem', bottom: '0.85rem' }}
              onClick={() => {
                handleAskButtonClick()
              }
              } />
          </div>

          <Collapse size="small" style={{ width: "100%" }} activeKey={activePanelKeys} onChange={key => setActivePanelKeys(key)}>
            <Panel data-testid="configuration-panel" header="🛠 Configuration" key="1">
              <h4>Paper sections in use:</h4>
              <SectionSelector uploadedPaper={uploadedPaper} setFilteredPaper={setFilteredPaper} />
            </Panel>
            <Panel data-testid="predefined-actions-panel" header="📦 Predefined prompts" key="2" >
              <Flex css={{ gap: '$7', justifyContent: "flex-start" }}>
                <Button
                  onClick={() => {
                    setQuestion(`Please extract the into a markdown table all the datasets mentioned in the following text.
                              The table should have the following columns: "Name", "Size", "Demographic information", "Origin", "Link to Data or Code", "Passage" and "Extra Info".
                              Here's a few caveats about how you should build your response:
                              - Include every dataset referenced, regardless of its online availability.
                              - Only include complete datasets, not subsets.
                              - "Link to Data or Code" field must point to the datasets url, not the paper.
                              - Keep the "Extra Info" field brief and to the point.
                              - The "Passage" field should contain the exact excerpt from the paper where the dataset is mentioned, and it must not be empty.
                              - Each dataset's "Name" must be unique, and always present.
                              - Ensure all table entries reflect only what's explicitly stated in the paper.
                              - Remember to only add actual palpable datasets. Normally these will have a succint characteristic name.`.replaceAll("  ", ""))
                  }
                  }
                  icon={<DotChartOutlined />}
                >Extract datasets</Button>
                <Button
                  onClick={() => {
                    setQuestion(`
                      Please provide me a per-section summary of the paper. Each section summary should contain the main takewaways.
                      The summary should be as detailed as possible.
                      `.replaceAll("    ", ""))
                  }
                  }
                  icon={<FileTextTwoTone />}
                >Generate Summary
                </Button>
                <Button
                  onClick={() => {
                    setQuestion(`Please explain the following text in simple words. If possible, try to explain it in the context of the paper. "${selectedText}"`)
                  }
                  }
                  icon={<HighlightTwoTone twoToneColor="#FFC400" />}
                >Explain selected text
                </Button>
                <Button
                  type="dashed"
                  onClick={() => {
                    setIsCustomPromptModalVisible(true)
                  }}
                  icon={<EditOutlined />}
                >Manage Custom Prompts
                </Button>
                {customPrompts && customPrompts.length > 0 && customPrompts.map(({title, prompt}) => {
                  return <Button
                    type="dashed"
                    key={title}
                    onClick={() => {
                      setQuestion(prompt)
                    }}
                  >{title}</Button>
                })}
              </Flex>
            </Panel>
            {isMobile() &&
              <Panel header="⬆️ Upload another paper" key="3">
                <PaperUploader alternative onFinish={(paper, pdf) => {
                  setUploadedPaper(paper)
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
    <CustomPromptManager
      isVisible={isCustomPromptModalVisible}
      setIsVisible={setIsCustomPromptModalVisible}
      customPrompts={customPrompts}
      setCustomPrompts={setCustomPrompts} />
  </>
  )
};


export default Home;