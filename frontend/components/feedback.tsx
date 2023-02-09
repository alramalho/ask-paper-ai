import {Button, CSS, Divider, Input, Modal, Radio, styled, Text, Textarea} from '@nextui-org/react';
import {Flex} from "./styles/flex";
import React, {useState} from "react";
import axios from "axios";
import {Paper} from "../pages";
import useCustomSession from "../hooks/session";

const StyledRadio = styled(Radio, {
  margin: '0 $5',
  fontSize: '0.8rem',
})

const StyledLabel = styled('label', {
  borderBottom: '1px solid $gray500',
})
interface FeedbackProps {
  paper: Paper,
  answer: string,
  question: string,
  userEmail: string
  css?: CSS,
}

const Feedback = ({css, userEmail, paper, answer, question}: FeedbackProps) => {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [nextFeature, setNextFeature] = useState<string | undefined>(undefined);
  const [visible, setVisible] = useState(false);
  const [wasAnswerAccurate, setWasAnswerAccurate] = useState<boolean | undefined>(undefined);
  const [sentiment, setSentiment] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const {data: session} = useCustomSession()

  function storeFeedback(data: any) {
    return axios.post(`${process.env.NEXT_PUBLIC_BACKEND_APIURL}/store-feedback`, {
      "table_name": "HippoPrototypeFeedback",
      "data": data,
    }, {
      headers: {
        'Content-Type': 'application/json',
        // @ts-ignore
        'Authorization': `Bearer ${session!.accessToken}`,
      },
    })
  }


  if (success) {
    return (<Text>Thank you {session?.user?.name ?? ''}! 🙏</Text>)
  }
  return (
    <>
      <Text h5>Can you help us improve? 🚀</Text>
      <Flex css={{gap: "$7"}}>

        <Button ghost auto color="success" size="lg" iconRight="👍"
                css={{color: 'green', '&:hover': {color: 'white'}}}
                onPress={() => {
                  setVisible(true)
                  setWasAnswerAccurate(true)
                }}
        >
          Answer was accurate
        </Button>
        <Button ghost auto size="lg" iconRight="👎"
                onPress={() => {
                  setVisible(true)
                  setWasAnswerAccurate(false)
                }}
        >
          Answer was inaccurate
        </Button>
      </Flex>
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
            <StyledLabel htmlFor='nextFeature'>What feature would you rather see next?</StyledLabel>
            <Radio.Group
              value={nextFeature}
              onChange={setNextFeature}
              isRequired
              name="nextFeature"
              id="nextFeature"
            >
              <StyledRadio size="sm" value="data-exploration" description="(like kaggle)">🔍 Inline data exploration tool </StyledRadio>
              <StyledRadio size="sm" value="similar-items" description="(papers, datasets, models)">🧩 Recommendation on similar items</StyledRadio>
              <StyledRadio size="sm" value="batch-paper-upload">⬆️ Upload & ask papers in batch</StyledRadio>
              <StyledRadio size="sm" value="email-interface">📩 Email interface</StyledRadio>
              <StyledRadio size="sm" value="more-speed">🏎 Improve overall speed</StyledRadio>
              <StyledRadio size="sm" value="more-accuracy">🎯 Improve overall accuracy</StyledRadio>
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
              <Button onClick={() => {
                if (userEmail && sentiment) {
                  storeFeedback({
                    email: userEmail,
                    was_answer_accurate: wasAnswerAccurate,
                    sentiment,
                    next_feature: nextFeature,
                    message,
                    paper_id: paper.id,
                    question,
                    answer,
                  })
                    .then(() => setSuccess(true))
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
      </Modal>
    </>
  )
};

export default Feedback;