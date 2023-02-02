import {Button, CSS, Modal, Radio, Text, Textarea, useModal} from '@nextui-org/react';
import {Flex} from "./styles/flex";
import React, {useState} from "react";
import {Honeypot, NetlifyForm} from 'react-netlify-forms'

interface FeedbackProps {
  css?: CSS
}

const Feedback = ({css}: FeedbackProps) => {
  const [visible, setVisible] = React.useState(false);
  const [checked, setChecked] = useState<string | undefined>(undefined)

  return (
    <>
      <Button ghost auto size="xl" onPress={() => setVisible(true)} iconRight="🚀">
        Can you help us improve?
      </Button>
      <Modal
        scroll
        closeButton
        aria-labelledby="feedback-modal"
        open={visible}
        onClose={() => setVisible(false)}
      >
        <Modal.Body>

          <NetlifyForm name='Feedback' honeypotName='bot-field'>
            {({handleChange, success, error}) => (
              <Flex direction="column" css={{gap: "$10", minWidth: "300px", maxWidth: "99vw"}}>
                <Honeypot/>
                {success && <Text>Thank you! 🙏</Text>}
                {error && (
                  <Text>Sorry, we could not reach our servers. Please try again later.</Text>
                )}
                {!success && !error &&
                    <>
                        <label htmlFor='sentiment'>How do you feel about the tool?</label>
                        <Radio.Group
                            value={checked}
                            onChange={setChecked}
                            isRequired
                            name="sentiment"
                            id="sentiment"
                        >
                            <Radio value="Very good" color="error">☹️</Radio>
                            <Radio value="Bad" color="error">😕</Radio>
                            <Radio value="Good" color="error">🙂</Radio>
                            <Radio value="Very bad" color="error">😍</Radio>
                        </Radio.Group>
                        <Flex direction="column" css={{width:"100%", gap: "$4"}}>
                            <label htmlFor='message'>Extra comments:</label>
                            <Textarea
                                name='message'
                                id='message'
                                minRows={2}
                                maxRows={20}
                                onChange={handleChange}
                                placeholder='Please provide extra comments! This could be anything from a bug report to a feature request.'
                                // @ts-ignore
                                css={{width: "100%"}}
                            />
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