import {Button, CSS, Input, Modal, Radio, Switch, Text, Textarea} from '@nextui-org/react';
import {Flex} from "./styles/flex";
import React, {useState} from "react";
import {Honeypot, NetlifyForm} from 'react-netlify-forms'
import {Paper} from "../pages";

interface FeedbackProps {
  paper: Paper,
  answer: string,
  userEmail: string
  css?: CSS,
}

const Feedback = ({css, paper, answer, userEmail}: FeedbackProps) => {
  const [visible, setVisible] = React.useState(false);
  const [includeAttachments, setIncludeAttachments] = useState<boolean>(true);
  const [checked, setChecked] = useState<string | undefined>(undefined)

  return (
    <>
      <Button ghost auto size="xl" onPress={() => setVisible(true)} iconRight="🚀">
        Can you help us improve?
      </Button>
      <Modal
        closeButton
        aria-labelledby="feedback-modal"
        open={visible}
        onClose={() => setVisible(false)}
        width={'fit-content'}
      >
        <Modal.Header>
          <Text css={{textDecoration: 'underline'}} id="feedback-modal" span size={20}>
            Hippo's <Text b>Feedback form </Text>
          </Text>
        </Modal.Header>
        <Modal.Body>

          <NetlifyForm name='Feedback' honeypotName='bot-field'>
            {({handleChange, success, error}) => (
              <Flex direction="column" css={{gap: "$10"}}>
                <Honeypot/>
                {success && <Text>Thank you! 🙏</Text>}
                {error && (
                  <Text>Sorry, we could not reach our servers. Please try again later.</Text>
                )}
                {!success && !error &&
                    <>
                        <Flex css={{gap: "$4"}}>
                            <label htmlFor='email'>Submitting as </label>
                            <Input readOnly id="email" name="email" initialValue={userEmail} width={"300px"}/>
                        </Flex>
                        <label htmlFor='sentiment'>How do you feel about the tool?</label>
                        <Radio.Group
                            value={checked}
                            onChange={setChecked}
                            isRequired
                            name="sentiment"
                            id="sentiment"
                        >
                            <Radio value="Very good" name="sentiment">☹️</Radio>
                            <Radio value="Bad" name="sentiment">😕</Radio>
                            <Radio value="Good" name="sentiment">🙂</Radio>
                            <Radio value="Very bad" name="sentiment">😍</Radio>
                        </Radio.Group>
                        <Flex direction="column" css={{width: "100%", gap: "$4"}}>
                            <label htmlFor='message'>Extra comments:</label>
                            <Textarea
                                bordered
                                name='message'
                                id='message'
                                minRows={2}
                                maxRows={20}
                                onChange={handleChange}
                                placeholder='Please provide extra comments! This could be anything from a bug report to a feature request.'
                              // @ts-ignore
                                css={{width: "400px"}}
                            />
                        </Flex>
                        <Flex css={{gap: "$4"}}>
                            <label htmlFor='attachments'>Include Answer & Paper </label>
                            <Switch
                                id="attachments"
                                checked={includeAttachments}
                                onChange={() => setIncludeAttachments(previous => !previous)}
                            />
                          {includeAttachments && paper &&
                              <Input
                                  readOnly
                                  initialValue={JSON.stringify(paper)}
                                  id="paper"
                                  name="paper"
                                // @ts-ignore
                                  css={{visibility: 'hidden', position: 'fixed', mw: 0, mh: 0}}
                              >
                              </Input>
                          }
                          {includeAttachments && answer &&
                              <Input
                                  readOnly
                                  initialValue={answer}
                                  id="answer"
                                  name="answer"
                                  // @ts-ignore
                                  css={{visibility: 'hidden', position: 'fixed', mw: 0, mh: 0}}
                              >
                              </Input>
                          }

                        </Flex>
                        <Modal.Footer>
                            <Button auto flat color="error" onPress={() => setVisible(false)}>
                                Close
                            </Button>
                            <Button type='submit'>Submit 🚀</Button>
                        </Modal.Footer>
                    </>
                }
              </Flex>
            )}
          </NetlifyForm>
        </Modal.Body>

      </Modal>
    </>
  )
};

export default Feedback;