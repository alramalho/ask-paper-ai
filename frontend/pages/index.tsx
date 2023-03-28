import { Badge, Button, Loading, Spacer, Switch, Text, Textarea, useInput, Image, Link } from "@nextui-org/react";
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
import Info from "../components/info";
import { useSession } from "next-auth/react";


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

const RobotAnswer = ({children}) => {
  return (
    <Flex css={{ margin: '$6', gap: "$5", flexWrap: 'no-wrap' }}>
      <Box css={{
        minWidth: "60px",
        maxWidth: "60px",
        alignSelf: 'end',
        transform: 'translateY(20px)'
      }}>
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
        {children}
      </Box>
    </Flex>
  )
}

const Home = () => {
  const [LLMResponse, setLLMResponse] = useState<string | undefined>(undefined)
  const [errorResponse, setErrorResponse] = useState<string | undefined>(undefined)
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [loadingText, setLoadingText] = useState<string | undefined>(undefined)
  const [underFeedbackText, setUnderFeedbackText] = useState<string | undefined>(undefined)
  const [quoteChecked, setQuoteChecked] = useState<boolean>(true)
  const [selectedPaper, setSelectedPaper] = useState<Paper | undefined | null>(undefined)
  const { isUserLoggedInAsGuest, remainingTrialRequests, setRemainingTrialRequests } = useContext(GuestUserContext)
  const { data: session } = isUserLoggedInAsGuest ? useGuestSession() : useSession()
  const [pdf, setPdf] = useState<File | undefined>(undefined);
  const [isFeedbackModalVisible, setIsFeedbackModalVisible] = useState<boolean>(false)
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'error' | 'done'>('idle')
  const [resultsSpeedTradeoff, setResultsSpeedTradeoff] = useState<number>(0)

  const {
    value: question,
    setValue: setQuestion,
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


  function handleSubmit<T extends any[], R>(func: (...args: T) => Promise<AxiosResponse<any, any>>, ...args: T) {
    setIsRunning(true)
    setLoadingText("Reading paper...")
    setQuestion(question)

    func(...args)
      .then(res => {
        setLLMResponse(makeLinksClickable(fixNewlines(res.data.message)))
        if (isUserLoggedInAsGuest && setRemainingTrialRequests != undefined && session!.user!.email !== null && session!.user!.email !== undefined) {
          getRemainingRequestsFor(session!.user!.email).then(res => {
            setRemainingTrialRequests(res.data.remaining_trial_requests)
          })
        }
      })
      .catch(error => {
        if (error.response) {
          setErrorResponse("Something went wrong with server's response...</br>Details: " + error.response.data.detail)
        } else {
          setErrorResponse("Something went wrong...</br>Technical Details: " + error.message)
        }
        console.error(error)
      })
      .finally(() => {
        setIsRunning(false)
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
    }} />
    {isUserLoggedInAsGuest &&
      <>
        <ProfileInfo name={session!.user!.email} imageURL={session!.user!.image} />
        <RemainingRequests value={remainingTrialRequests} />
      </>
    }
    {selectedPaper &&
      <>
        <Flex direction='column' css={{ margin: '$10', gap: '$10' }}>
          {pdf && <PdfViewer
            pdf={pdf}
          />}
          <Flex direction={'column'}>
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
                  }
                  }> Ask </Button>
                <Flex css={{ gap: "$2" }}>
                  <Switch bordered initialChecked checked={quoteChecked}
                    onChange={() => setQuoteChecked(previous => !previous)}></Switch>
                  <Text small>Quote paper</Text>
                </Flex>
                <IconSlider min={0} max={4} onChange={setResultsSpeedTradeoff} value={resultsSpeedTradeoff} />
              </Flex>
            </Flex>
            <Spacer y={2} />
            <h4>Or start with predefined action:</h4>
            <Flex css={{ gap: '$7' }}>
              <Button
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
                }}
              >
                <Text>Extract datasets</Text>
              </Button>
              <Button
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
            <Info text="Your first request might be exceptionally slower, while the API bootstraps" />
            <Spacer y={4} />
            <h3>Answer:</h3>
            {isRunning
              && <>
                <Loading data-testid="loading-answer">{loadingText}</Loading>
              </>
            }
            {LLMResponse &&
              <>
                <RobotAnswer>
                    <Box id="answer">
                      <MarkdownView
                        markdown={LLMResponse}
                        options={{ tables: true, emoji: true, }}
                      />
                    </Box>
                    <Spacer y={2} />
                    <Flex css={{ justifyContent: 'flex-start', gap: "$4" }}>
                      <Button
                        auto
                        css={{
                          border: "2px solid $yellow400",
                          backgroundColor: "$backgroundLighter",
                          '&:hover': {
                            backgroundColor: "$yellow400",
                          }
                        }}
                        onPress={() => {
                          setEmailStatus('sending')
                          sendAnswerEmail({
                            // @ts-ignore # todo: dafuq? Why is this comment needed
                            email: session!.user!.email,
                            question: question,
                            // @ts-ignore
                            answer: document?.getElementById('answer')?.innerHTML, // to keep the html format
                            paperTitle: selectedPaper!.title
                          }).then(() => {
                            setEmailStatus('done')
                            setTimeout(() => {
                              setEmailStatus('idle')
                            }, 5000)
                          })
                            .catch(() => setEmailStatus('error'))
                        }}
                      >
                        <Text>Email me this 📩</Text>
                      </Button>
                      {emailStatus == 'sending' && <Text>Sending email...</Text>}
                      {emailStatus == 'done' &&
                        <Text data-testid="email-sent">Email sent! ✅</Text>}
                      {emailStatus == 'error' &&
                        <Text>There was an error ❌ Please contact support.</Text>}
                    </Flex>
                </RobotAnswer>
                <Spacer y={1} />
                <Flex css={{ gap: "$7" }}>

                  <Button ghost auto color="success" size="lg" iconRight="👍"
                    css={{
                      color: 'green',
                      '&:hover': { color: 'white', backgroundColor: 'green' },
                    }}
                    onPress={() => {
                      storeFeedback(session!.user!.email!, {
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
                      storeFeedback(session!.user!.email!, {
                        email: session!.user!.email,
                        was_answer_accurate: false,
                        question,
                        answer: LLMResponse,
                        // @ts-ignore
                      }, session!.accessToken)
                      setUnderFeedbackText('Thats unfortunate... Would you care to tell us more via the feedback form? 🙏')
                      setTimeout(() => setUnderFeedbackText(undefined), 8000)
                    }}
                  >
                    Answer was inaccurate
                  </Button>
                </Flex>
                <Spacer y={1} />

                {underFeedbackText && <Text css={{ maxWidth: '400px' }}>{underFeedbackText}</Text>}

              </>
            }
            {errorResponse && LLMResponse == undefined && <RobotAnswer>
              <MarkdownView
                        markdown={errorResponse + "<br/> Please try again later or contact support."}
                        options={{ tables: true, emoji: true, }}
                      />
              </RobotAnswer>}
            <Spacer y={4} />
          </Flex>
        </Flex>
      </>
    }
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
      <Text b css={{ color: 'inherit' }}>👋 Feedback?</Text>
    </Box>
  </>
  )
};

function fixNewlines(text: string) {
  return text.replace(/\\n/g, '\n').replace(/  /g, '')
}

function makeLinksClickable(text: string) {
  return text.replace(/(https?:\/\/[^\s]+)/g, "<a target=\"__blank\" href='$1'>$1</a>");
}

export default Home;