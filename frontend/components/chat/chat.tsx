import { CSS } from "@nextui-org/react/types/theme";
import { useEffect } from "react";
import { Paper } from "../../pages";
import { Box } from "../next-auth-session-wrapper";
import LLMResponse from "./llm-response";
import UserResponse from "./user-response";
import SystemResponse from "./system-response";

export interface ChatMessage {
  text: string;
  sender: "user" | "llm" | "system";
}

interface ChatProps {
  chatHistory: ChatMessage[];
  selectedPaper: Paper;
  css?: CSS;
  [otherPropName: string]: any;
}

const Chat = ({ chatHistory, selectedPaper, css, ...props }: ChatProps) => {

  return (
    <Box id="chat" css={{ flexGrow: 1, alignContent: 'end', overflow: 'auto', minWidth: "100%", maxWidth: "100%", ...css }} {...props}>
      {chatHistory.map((msg, index) => {
        if (msg.sender === "llm") {
          return <LLMResponse chatHistory={chatHistory} selectedPaper={selectedPaper} messageStatus={props.messageStatus} text={msg.text} />
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