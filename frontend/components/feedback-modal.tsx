import {Button, CSS, Divider, Input, Loading, Modal, Radio, styled, Text, Textarea} from '@nextui-org/react';
import {Flex} from "./styles/flex";
import React, {useContext, useEffect, useState} from "react";
import axios from "axios";
import {Paper} from "../pages";
import useCustomSession, {GuestUserContext, useGuestSession} from "../hooks/session";
import {Box} from "./layout";

const StyledRadio = styled(Radio, {
  margin: '0 $5',
  fontSize: '0.8rem',
})

const StyledLabel = styled('label', {
  borderBottom: '1px solid $gray500',
})

interface FeedbackProps {
  paper: Paper | null,
  answer?: string | null,
  question?: string | null,
  userEmail: string
  css?: CSS,
  visible: boolean,
  setVisible: (visible: boolean) => void,
}

export function storeFeedback(data: any, accessToken: any) {
  return axios.post(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/store-feedback`, {
    "table_name": "HippoPrototypeFeedback",
    "data": data,
  }, {
    headers: {
      'Content-Type': 'application/json',
      // @ts-ignore
      'Authorization': `Bearer ${accessToken}`,
    },
  })
}

const FeedbackModal = ({css, userEmail, paper, answer, question, visible, setVisible}: FeedbackProps) => {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | undefined>(undefined);
  const [nextFeature, setNextFeature] = useState<string | undefined>(undefined);
  const [wasAnswerAccurate, setWasAnswerAccurate] = useState<boolean | undefined>(undefined);
  const [sentiment, setSentiment] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const {isUserLoggedInAsGuest} = useContext(GuestUserContext)
  const {data: session} = isUserLoggedInAsGuest ? useGuestSession() : useCustomSession()

  useEffect(() => {
    if (error != undefined) {
      setStatus('error')
    }
  }, [error])

  return (
    <>
      <Modal
        closeButton
        aria-labelledby="feedback-modal"
        open={visible}
        onClose={() => setVisible(false)}
        width={'fit-content'}
        id='feedback-modal'
      >
        {status == 'success'
          ? <Box css={{padding: "$10"}}>
            <Text data-testid="feedback-successful">Thank you {session?.user?.name ?? ''}! 🙏</Text>
          </Box>
          : status == 'sending'
            ? <Box css={{padding: "$10"}}> <Loading>Submitting feedback...</Loading> </Box>
            :
            <>

              <Modal.Header>
                <Text css={{textDecoration: 'underline'}} id="feedback-modal" span size={20}>
                  Hippo's <Text b>Feedback form </Text>🚀
                </Text>
              </Modal.Header>
              <Modal.Body>
                <Flex direction="column" css={{gap: "$10"}}>
                  <Flex css={{gap: "$4"}}>
                    <label htmlFor='email'>Submitting as</label>
                    <Input
                      readOnly
                      id="email"
                      name="email"
                      initialValue={userEmail}
                      width={"300px"}
                    />
                  </Flex>
                  <Divider/>

                  <StyledLabel htmlFor='sentiment'>How do you feel about the tool?</StyledLabel>
                  <Radio.Group
                    value={sentiment}
                    onChange={setSentiment}
                    isRequired
                    name="sentiment"
                    id="sentiment"
                    orientation='horizontal'
                  >
                    <StyledRadio size="lg" value="Very bad">😡️</StyledRadio>
                    <StyledRadio size="lg" value="Good">😕</StyledRadio>
                    <StyledRadio size="lg" value="Bad">🙂</StyledRadio>
                    <StyledRadio size="lg" value="Very good">😍</StyledRadio>
                  </Radio.Group>
                  <Divider/>
                  <StyledLabel htmlFor='nextFeature'>What feature would you like to see next?</StyledLabel>
                  <Radio.Group
                    value={nextFeature}
                    onChange={setNextFeature}
                    isRequired
                    name="nextFeature"
                    id="nextFeature"
                    // @ts-ignore
                    css={{maxWidth: '450px'}}
                  >
                    <StyledRadio size="sm" value="data-exploration" description="(like kaggle)">🔍 Inline data
                      exploration
                      tool </StyledRadio>
                    <StyledRadio size="sm" value="similar-items" description="(papers, datasets, models)">🧩
                      Recommendation
                      on similar items</StyledRadio>
                    <StyledRadio size="sm" value="batch-paper-upload">⬆️ Upload & ask papers in batch</StyledRadio>
                    <StyledRadio size="sm" value="email-interface"
                                 description="You would interact with the app via direct or CC communication with a designated email">📩
                      Email interface</StyledRadio>
                    <StyledRadio size="sm" value="customize-response-length">✍️ Customize response length</StyledRadio>
                    <StyledRadio size="sm" value="more-speed">🏎 Improve overall speed</StyledRadio>
                    <StyledRadio size="sm" value="more-accuracy">🎯 Improve overall accuracy</StyledRadio>
                    <StyledRadio size="sm" value="other" description="Please specify below!">🤷‍️ Other</StyledRadio>
                  </Radio.Group>
                  <Divider/>

                  <Flex direction="column" css={{width: "100%", gap: "$4"}}>

                    <label htmlFor='message'>Extra comments:</label>
                    <Textarea
                      bordered
                      name='message'
                      data-testid='message'
                      id='message'
                      minRows={2}
                      maxRows={20}
                      onChange={e => setMessage(e.target.value)}
                      placeholder='Please provide extra comments! This could be anything from a bug report to a more detailed feature request.'
                      // @ts-ignore
                      css={{width: "400px"}}
                    />
                  </Flex>
                  {error && <Text color="error">{error}</Text>}
                  <Modal.Footer>
                    <Button auto flat color="error" onPress={() => setVisible(false)}>
                      Close
                    </Button>
                    <Button data-testid="feedback-submit" onClick={() => {
                      if (userEmail && sentiment) {
                        setStatus('sending')
                        storeFeedback({
                          email: userEmail,
                          was_answer_accurate: wasAnswerAccurate,
                          question,
                          answer,
                          sentiment,
                          next_feature: nextFeature,
                          message,
                          paper_id: paper?.id ?? null,
                          // @ts-ignore
                        }, session!.accessToken)
                          .then(() => setStatus('success'))
                          .catch(e => {
                            console.error(e)
                            setError("Something went wrong :(")
                          })
                      } else {
                        setError("Please fill at least the sentiment field!")
                      }
                    }}>Submit 🚀</Button>
                  </Modal.Footer>
                </Flex>
              </Modal.Body>
            </>
        }
      </Modal>
    </>
  )
};

export default FeedbackModal;