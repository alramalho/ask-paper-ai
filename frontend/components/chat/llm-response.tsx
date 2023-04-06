import { Button, Spacer, Image, Text } from "@nextui-org/react"
import { useSession } from "next-auth/react"
import { useContext, useMemo, useRef, useState } from "react"
import MarkdownView from "react-showdown"
import { GuestUserContext, useGuestSession } from "../../hooks/session"
import { Paper, Status } from "../../pages"
import { sendAnswerEmail } from "../../service/service"
import { storeFeedback } from "../feedback-modal"
import { Box } from "../layout"
import { Flex } from "../styles/flex"
import { ChatMessage } from "./chat"

export const RobotAnswer = ({ children }) => {
    return (
        <Flex css={{ margin: '$6', gap: "$5", flexWrap: 'nowrap', overflow: 'visible', justifyContent: 'flex-start', '*': {fontSize: "0.86rem"} }}>
            <Box css={{
                minWidth: "35px",
                maxWidth: "35px",
                alignSelf: 'end',
            }}>
                <Image src="hippo.svg" />
            </Box>
            <Box id="answer-area" data-testid="answer-area" css={{
                textAlign: 'left',
                backgroundColor: '$backgroundLighter',
                border: '1px solid $gray600',
                padding: '$4',
                borderRadius: '20px 20px 20px 0',
            }}>
                {children}
            </Box>
        </Flex>
    )
}

interface LLMResponseProps {
    selectedPaper: Paper
    chatHistory: ChatMessage[]
    text: string
}


const LLMResponse = ({ selectedPaper, chatHistory, text }: LLMResponseProps) => {
    const [underFeedbackText, setUnderFeedbackText] = useState<string | undefined>(undefined)
    const [emailStatus, setEmailStatus] = useState<Status>('idle')
    const { isUserLoggedInAsGuest } = useContext(GuestUserContext)
    const { data: session } = isUserLoggedInAsGuest ? useGuestSession() : useSession()
    const answerRef = useRef(null)

    const question = useMemo(() => {
        function findPreviousMessage(messageContent: string, messages: ChatMessage[]): ChatMessage | undefined {
            const index = messages.findIndex(msg => msg.text === messageContent);
            if (index === -1) {
              return undefined;
            }
          
            const previousIndex = index - 1;
            if (previousIndex < 0) {
              return undefined;
            }
          
            return messages[previousIndex];
          }

          return findPreviousMessage(text, chatHistory)?.text ?? ""
    }, [chatHistory, text])

    return (<>
        <RobotAnswer>
            <Box id="answer" ref={answerRef} css={{padding: "$5"}}>
                <MarkdownView
                    markdown={text}
                    options={{ tables: true, emoji: true, }}
                />
            </Box>
            <Spacer y={1} />
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
                            setEmailStatus('loading')
                            sendAnswerEmail({
                                // @ts-ignore # todo: dafuq? Why is this comment needed
                                email: session!.user!.email,
                                question: question,
                                // @ts-ignore
                                answer: answerRef.current.innerHTML, // to keep the html format
                                paperTitle: selectedPaper!.title
                            }).then(() => {
                                setEmailStatus('success')
                                setTimeout(() => {
                                    setEmailStatus('idle')
                                }, 5000)
                            })
                                .catch(() => setEmailStatus('error'))
                        }}
                    >
                        <Text>Email me this 📩</Text>
                    </Button>
                    {emailStatus == 'loading' && <Text>Sending email...</Text>}
                    {emailStatus == 'success' &&
                        <Text data-testid="email-sent">Email sent! ✅</Text>}
                    {emailStatus == 'error' &&
                        <Text>There was an error ❌ Please contact support.</Text>}
                </Flex>
                <Flex css={{ gap: "$7" }}>
                    {<Text css={{ maxWidth: '400px' }}>{underFeedbackText ? underFeedbackText : "Was it accurate?"}</Text>}
                    <Button ghost auto color="success"
                        css={{
                            color: '"$success"',
                            '&:hover': { color: 'white', backgroundColor: '"$success"' },
                        }}
                        onPress={() => {
                            storeFeedback(session!.user!.email!, {
                                email: session!.user!.email,
                                was_answer_accurate: true,
                                question: question,
                                answer: text,
                                // @ts-ignore
                            }, session!.accessToken)
                            setUnderFeedbackText('Thank you! 🙏')
                        }}
                    >
                        👍
                    </Button>
                    <Button ghost auto
                        onPress={() => {
                            storeFeedback(session!.user!.email!, {
                                email: session!.user!.email,
                                was_answer_accurate: false,
                                question: question,
                                answer: text,
                                // @ts-ignore
                            }, session!.accessToken)
                            setUnderFeedbackText('Thats unfortunate... Would you care to tell us more via the feedback form? 🙏')
                        }}
                    >
                        👎
                    </Button>
                </Flex>
            </Flex>
        </RobotAnswer>

    </>)
}

export default LLMResponse