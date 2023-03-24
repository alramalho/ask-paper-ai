import {Text} from "@nextui-org/react";
import {Box} from "./layout";
import React, {useContext} from "react";
import {sendInstructionsEmail} from "../service/service";
import {GuestUserContext} from "../hooks/session";

const RemainingRequests = ({value}: {value: number}) => {
  const {userEmail} = useContext(GuestUserContext)

  return (
    <Box css={{
      background: 'rgba(0,0,0,0.03)',
      padding: "$10",
      border: '1px solid #aaaa',
      width: '600px',
      maxWidth: '95%',
      margin: "$4",
      borderRadius: '10px'
    }}>
      <Text h4>You have <Text as="span" color="warning" data-testid="remaining-requests">{value}</Text> remaining requests!</Text>
      <Text css={{fontSize: '1.1rem'}}>To unlock unlimited requests, please <a href="https://discord.gg/6zugVKk2sd">join us in
        discord</a></Text>
      <Text css={{fontSize: '0.9rem'}}>
        ℹ️ If you need help,{' '}
        <a onClick={() => sendInstructionsEmail(userEmail)}>click here</a> to receive a step-by-step instructions email.
        <br/>(it should take a few seconds to arrive)
      </Text>
    </Box>
  )
}

export default RemainingRequests;