import { Collapse, Text } from "@nextui-org/react";
import DiscordIcon from "./icons/discord-icon";
import { Box } from "./next-auth-session-wrapper";

const OverviewBlock = () => {
  return (
    <Box css={{ maxWidth: '700px', textAlign: 'left' }}>
      <Collapse.Group bordered>
        <Collapse
          title={<Text h4>What is AskPaper?</Text>}
          subtitle="A tool to ask, extract & help understanding papers"
          contentLeft={
            <Text css={{ fontSize: "2.2rem" }}>🤔</Text>
          }
        >
          <Text>Ask Paper allows you to more quickly read and extract information from papers. It allows you to upload
            papers either
            by URL or by uploading a PDF file, and then ask natural language questions about the paper (e.g. What is
            the paper about).
            You also have predefined actions like <code>Extract Datasets</code> and <code>Generate
              summary</code>.<br /><br />
            Plus, it is natively multiligual, so you can ask questions in any language you want!
          </Text>
        </Collapse>
        <Collapse
          title={<Text h4>How does this work?</Text>}
          subtitle="Using AI to aid researchers"
          contentLeft={
            <Text css={{ fontSize: "2.2rem" }}>❓</Text>
          }
        >
          <Text>Ask Paper is a tool powered by a Large Language Model. This is a Neural Network that was trained
            on a lot of internet text to get a fundamental understanding on how the language works, all by trying to
            predict
            the next word in a sequence. By feeding the paper contents and the query to the models, it will try to
            "predict" a plausible answer!
          </Text>
          <Text><b>Careful!</b> As stated above, this is only trained to generate <b>plausible</b> answers, so you're
            encouraged
            to verify its veracity. You can take usage of the "Quote" Switch in order to force the answer to contain
            paper quotes,
            minimizing wrong content</Text>
        </Collapse>
        <Collapse
          title={<Text h4>Who can use it?</Text>}
          subtitle="Anyone!"
          contentLeft={
            <Text css={{ fontSize: "2.2rem" }}>🙋</Text>
          }
        >
          <Text>Ask paper is free to use for every community member! All you have to do is register in discord and
            join our server.
            If you need further help, login as a guest and there's in an option to receive instructions via email on how to use the tool.
          </Text>
        </Collapse>
        <Collapse
          title={<Text h4>Why discord?</Text>}
          subtitle="Free, community oriented & reliable"
          contentLeft={
            <DiscordIcon fill="#5865F2" width="35" height="35" />
          }
        >
          <Text>Discord is a communication platform designed for co-creating communities online.
            It allows users to connect with each other through voice, video, and text chat.</Text>
          <Text>We use discord because it is a <b>free, open, reliable and
            easy-to-access</b> with the goal of uniting and build our own open sourced platform..</Text>
        </Collapse>
      </Collapse.Group>
    </Box>
  )
}
export default OverviewBlock