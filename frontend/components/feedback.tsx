import {Button, CSS, Input, Modal, Radio, Text, Textarea} from '@nextui-org/react';
import {Flex} from "./styles/flex";
import React, {useState} from "react";
import {Paper} from "../pages";

interface FeedbackProps {
  paper: Paper,
  answer: string,
  userEmail: string
  css?: CSS,
}

const Feedback = ({css, paper, answer, userEmail}: FeedbackProps) => {
  const [formState, setFormState] = useState({
    email: userEmail,
    paper: paper,
    answer: answer,
  })
  const [visible, setVisible] = React.useState(false);
  const [checked, setChecked] = useState<string | undefined>(undefined)

  const encode = data => {
    return Object.keys(data)
      .map(key => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
      .join("&")
  }
  const handleSubmit = e => {
    fetch("/", {
      method: "POST",
      headers: {"Content-Type": "application/x-www-form-urlencoded"},
      body: encode({
        "form-name": "Feedback",
        ...formState,
      }),
    })
      .then(() => {
        setVisible(false)
      })
      .catch((e) => {
        console.log(e)
        setVisible(false)
      })

    e.preventDefault()
  }

  const handleChange = e => {
    setFormState(previousState => ({...previousState, [e.target.name]: e.target.value}))
  }

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
          <form
            name="contact"
            method="post"
            data-netlify="true"
            data-netlify-honeypot="bot-field"
            onSubmit={handleSubmit}
          >
            <input type="hidden" name="feedback-form" value="feedback"/>

            <Flex direction="column" css={{gap: "$10"}}>
              <Flex css={{gap: "$4"}}>
                <label htmlFor='email'>Submitting as </label>
                <Input
                  readOnly
                  id="email"
                  name="email"
                  initialValue={userEmail}
                  width={"300px"}
                />
              </Flex>
              <label htmlFor='sentiment'>How do you feel about the tool?</label>
              <Radio.Group
                value={checked}
                onChange={(value) => {
                  setFormState(previousState => ({...previousState, sentiment: value}))
                  setChecked(value)
                }}
                isRequired
                name="sentiment"
                id="sentiment"
              >
                <Radio value="Very bad">😡️</Radio>
                <Radio value="Good">😕</Radio>
                <Radio value="Bad">🙂</Radio>
                <Radio value="Very good">😍</Radio>
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
                <Input
                  readOnly
                  onChange={handleChange}
                  initialValue={JSON.stringify(paper)}
                  id="paper"
                  name="paper"
                  // @ts-ignore
                  css={{visibility: 'hidden', position: 'fixed', mw: 0, mh: 0}}
                >
                </Input>
                <Input
                  readOnly
                  onChange={handleChange}
                  initialValue={answer}
                  id="answer"
                  name="answer"
                  // @ts-ignore
                  css={{visibility: 'hidden', position: 'fixed', mw: 0, mh: 0}}
                >
                </Input>
              </Flex>
              <Modal.Footer>
                <Button auto flat color="error" onPress={() => setVisible(false)}>
                  Close
                </Button>
                <Button type='submit'>Submit 🚀</Button>
              </Modal.Footer>
            </Flex>
          </form>
        </Modal.Body>

      </Modal>
    </>
  )
};

export default Feedback;