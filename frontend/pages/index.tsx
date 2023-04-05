import { Badge, Button, Loading, Spacer, Switch, Text, Textarea, useInput, Image, Link, Collapse, Divider, Card, Grid } from "@nextui-org/react";
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

const RobotAnswer = ({ children }) => {
  return (
    <Flex css={{ margin: '$6', gap: "$5", flexWrap: 'nowrap', overflow: 'visible', justifyContent: 'flex-start' }}>
      <Box css={{
        minWidth: "40px",
        maxWidth: "40px",
        alignSelf: 'end',
        transform: 'translateY(20px)'
      }}>
        <Image src="hippo.svg" />
      </Box>
      <Box id="answer-area" data-testid="answer-area" css={{
        textAlign: 'left',
        backgroundColor: '$backgroundLighter',
        border: '1px solid $gray600',
        padding: '$10',
        borderRadius: '20px 20px 20px 0',
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
  const [resultsSpeedTradeoff, setResultsSpeedTradeoff] = useState<number>(4)

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
    <Box css={{ display: 'flex', flexWrap: 'nowrap', height: '100%', alignItems: 'center' }}>
      <Box as="main" css={{ overflow: 'auto', paddingRight:"$10" }}>
        <Flex css={{ flexWrap: 'nowrap', flexDirection: "column" }}>
          <Box>
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
          background: "rgba(0,0,0,.02)",
          backdropFilter: "blur(3px)",
          textAlign: 'left',
          borderLeft: "1px solid gray",
          borderRadius: '0',
          height: '100%',
          flex: '1 0 10%'
        }}>
          <Box data-testid="chat" css={{ flexGrow: 1 }}>

          </Box>
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
                <Flex direction="row" css={{ justifyContent: "space-between", gap: "$3" }}>
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
                  <Flex css={{ gap: "$7" }}>
                    <Text>Was it accurate?</Text>
                    <Button ghost auto color="success"
                      css={{
                        color: '"$success"',
                        '&:hover': { color: 'white', backgroundColor: '"$success"' },
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
                      👍
                    </Button>
                    <Button ghost auto
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
                      👎
                    </Button>
                  </Flex>
                </Flex>
                <Spacer y={1} />
              </RobotAnswer>
              <Spacer y={1} />

              {underFeedbackText && <Text css={{ maxWidth: '400px' }}>{underFeedbackText}</Text>}

            </>
          }
          {errorResponse && LLMResponse == undefined &&
            <RobotAnswer>
              <MarkdownView
                markdown={errorResponse + "<br/> Please try again later or contact support."}
                options={{ tables: true, emoji: true, }}
              />
            </RobotAnswer>
          }
          <Divider css={{ margin: '$5 0' }} />

          <Card.Footer css={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'start',
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
                css={{ marginBottom: "$5", background: '$backgroundLighter' }}
              />
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
            </Flex>
            <Collapse
              bordered
              title=""
              subtitle="🛠 Configuration"
              css={{ width: '100%'}}
            >
              <Flex css={{ gap: "$2", justifyContent: 'flex-start' }}>
                <Switch bordered initialChecked checked={quoteChecked}
                  onChange={() => setQuoteChecked(previous => !previous)}></Switch>
                <Text small>Quote paper</Text>
              </Flex>
              <Spacer y={1} />
              <IconSlider min={0} max={4} onChange={setResultsSpeedTradeoff} value={resultsSpeedTradeoff} />
            </Collapse>
            <Spacer y={1} />
            <h4>Or start with predefined action:</h4>
            <Flex css={{ gap: '$7', justifyContent: "flex-start" }}>
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
            <Spacer y={1} />
          </Card.Footer>
        </Card>
      }
    </Box>

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
      position: 'absolute',
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
  return text.replace(/(https?:\/\/[^\s]+)/g, "<a target=\"__blank\" href='$1'>link</a>");
}

export default Home;