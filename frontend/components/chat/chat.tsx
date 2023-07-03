import { CSS } from "@nextui-org/react/types/theme";
import { Paper } from "../../pages";
import { Box } from "../next-auth-session-wrapper";
import LLMResponse from "./llm-response";
import SystemResponse from "./system-response";
import UserResponse from "./user-response";

export type ChatMessage = {
  text: string;
  sender: "user" | "llm" | "system";
}

interface ChatProps {
  chatHistory: ChatMessage[];
  paper: Paper;
  css?: CSS;
  [otherPropName: string]: any;
}

const Chat = ({ chatHistory, paper, css, ...props }: ChatProps) => {

  return (
    <Box id="chat" css={{ flexGrow: 1, alignContent: 'end', overflow: 'auto', minWidth: "100%", maxWidth: "100%", ...css }} {...props}>
      {chatHistory.map((msg, index) => {
        if (msg.sender === "llm") {
          return <LLMResponse chatHistory={chatHistory} paper={paper} messageStatus={props.messageStatus} text={msg.text} />
        } else if (msg.sender === "user") {
          return <UserResponse text={msg.text} />
        } else{
          return <SystemResponse text={msg.text} />
        }

      })}
    </Box>
  );
};

export default Chat;