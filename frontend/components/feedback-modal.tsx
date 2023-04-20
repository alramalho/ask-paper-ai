import {Button, CSS, Divider, Input, Loading, Modal, Radio, styled, Text, Textarea} from '@nextui-org/react';
import {Flex} from "./styles/flex";
import React, {useContext, useEffect, useState} from "react";
import axios from "axios";
import {Paper} from "../pages";
import {GuestUserContext, useGuestSession} from "../hooks/session";
import {Box} from "./layout";
import { useSession } from 'next-auth/react';
import Nps from './my-slider';

const StyledRadio = styled(Radio, {
  margin: '0 $5',
  fontSize: '0.8rem',
})

const StyledLabel = styled('label', {
  borderBottom: '1px solid $gray500',
})

interface FeedbackProps {
  userEmail: string
  css?: CSS,
  visible: boolean,
  setVisible: (visible: boolean) => void,
}

export function storeFeedback(email: string, data: any, accessToken: any) {
  return axios.post(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/store-feedback`, {
    "table_name": "HippoPrototypeFeedback",
    "data": data,
  }, {
    headers: {
      'Content-Type': 'application/json',
      // @ts-ignore
      'Authorization': `Bearer ${accessToken}`,
      'Email': email,
    },
  })
}

const FeedbackModal = ({css, userEmail, visible, setVisible}: FeedbackProps) => {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | undefined>(undefined);
  const [nextFeature, setNextFeature] = useState<string | undefined>(undefined);
  const [nps, setNps] = useState<number | undefined>(undefined);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const {isUserLoggedInAsGuest} = useContext(GuestUserContext)
  const {data: session} = isUserLoggedInAsGuest ? useGuestSession() : useSession()

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
                  <Nps value={nps} onChange={setNps} defaultValue={nps}/>
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
                    <StyledRadio size="sm" value="browser-extension">💻 Use as browser extension</StyledRadio>
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
                      if (userEmail && nps) {
                        setStatus('sending')
                        storeFeedback(session!.user!.email!, {
                          email: userEmail,
                          nps,
                          next_feature: nextFeature,
                          message,
                          // @ts-ignore
                        }, session!.accessToken)
                          .then(() => setStatus('success'))
                          .catch(e => {
                            console.error(e)
                            setError("Something went wrong :(")
                          })
                      } else {
                        setError("Please fill at least the recommendation field!")
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