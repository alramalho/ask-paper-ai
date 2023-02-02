import {
  Button,
  Card, Collapse,
  CSS,
  Grid,
  Image,
  Input,
  Link,
  Radio,
  Spacer,
  StyledInputLabel,
  Text,
  Textarea
} from '@nextui-org/react';
import { Flex } from "./styles/flex";
import React, { useState } from "react";
import { Box } from "./layout";
import { NetlifyForm, Honeypot } from 'react-netlify-forms'

interface FeedbackProps {
  css?: CSS
}

const Feedback = ({ css }: FeedbackProps) => {
  const [checked, setChecked] = useState<string | undefined>(undefined)
  return (
    <>
      <Collapse
        bordered
        title="Feedback 🚀"
        subtitle="Submit feedback to help us improve"
      >
        <NetlifyForm name='Feedback' honeypotName='bot-field'>
          {({ handleChange, success, error }) => (
            <Flex direction="column" css={{ gap: "$10", minWidth: "300px", maxWidth: "99vw" }}>
              <Honeypot />
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
                  <Flex direction="column">
                    <label htmlFor='message'>Extra message:</label>
                    <Textarea
                      name='message'
                      id='message'
                      onChange={handleChange}
                      placeholder='Please provide extra comments! This could be anything from a bug report to a feature request.'
                    />
                  </Flex>
                  <Button type='submit'>Submit</Button>
                </>
              }
            </Flex>
          )}
        </NetlifyForm>
      </Collapse>
    </>
  )
};

export default Feedback;