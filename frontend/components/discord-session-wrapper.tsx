import {
  Avatar,
  Button, Collapse,
  Divider,
  Image,
  Input,
  Link,
  Loading,
  Spacer,
  styled,
  Text
} from '@nextui-org/react';
import {Flex} from "./styles/flex";
import {signIn, useSession} from "next-auth/react"
import {useEffect, useState} from "react";
import axios from "axios";
import DiscordIcon from "./icons/discord-icon";
import {Code} from "./layout";


interface LayoutProps {
  children: React.ReactNode;
}

export const Box = styled('div', {
  boxSizing: 'border-box',
});

const DiscordSessionWrapper = ({children}: LayoutProps) => {
  const [userWhitelisted, setUserWhitelisted] = useState<Boolean | undefined>(undefined);
  const [userInDiscord, setUserInDiscord] = useState<Boolean | undefined>(undefined);
  const {data: session, status} = useSession()
  const [email, setEmail] = useState<string | undefined>(undefined);
  const [underText, setUnderText] = useState<string | undefined>(undefined);

  function sendInstructionsEmail(recipient) {
    return axios.post(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/send-instructions-email`, {
      "recipient": recipient,
    })
  }

  const requiredRole = 'Ask Paper Pilot'
  useEffect(() => {
      if (session != undefined && userWhitelisted == undefined) {
        axios.get("https://discord.com/api/users/@me", {
          headers: {
            // @ts-ignore
            "Authorization": `Bearer ${session?.accessToken}`
          },
        }).then((response) => {
          axios.get(`/api/discord/${requiredRole}?userId=${response.data.id}`)
            .then(res => {
              setUserWhitelisted(res.data.hasRole)
              setUserInDiscord(res.data.inDiscord)
            })
            .catch(e => {
              console.log(e)
              setUserWhitelisted(false)
            })
        })
          .catch((error) => {
            console.log(error)
          })
      }
    }, [session, userWhitelisted]
  )

  if (session == null && status == "loading") {
    return (
      <>
        <Loading>Checking if you're signed in...</Loading>
      </>
    )
  }
  if (session == null && status == "unauthenticated") {
    return (<Flex justify='center' direction='column'>

      <Text h4>You are not signed in!</Text>
      <Spacer y={1}/>
      <Flex css={{justifyContent: 'center', alignItems: 'center', gap: "$8"}}>
        <Button size="lg" css={{backgroundColor: '$discordColor'}} icon={<DiscordIcon/>}
                onClick={() => signIn("discord")}>
          Join with Discord
        </Button>
        <Button css={{paddingLeft: "$16"}}size="lg" bordered color="secondary" icon={<DiscordIcon/>}
                onClick={() => window.location.href = "https://discord.com/register?redirect_to=https://askpaper.ai"}>
          Create discord account
        </Button>
      </Flex>
      {process.env.ENVIRONMENT != 'production' &&
          <>
              <Spacer y={2}/>
              <Text b css={{
                marginBottom: "$2"
              }}>or</Text>
              <Box>
                  <Input
                    // @ts-ignore
                      css={{
                        minWidth: "100%",
                        padding: "0",
                        margin: "0",
                      }} placeholder="Email" initialValue={email} onChange={(e) => setEmail(e.target.value)}/>
                  <Button size="lg" auto bordered color="error" css={{
                    marginTop: "$4",
                    backgroundColor: 'transparent',
                    textTransform: 'uppercase',
                    borderRadius: "$0"
                  }} icon={<Text>📩</Text>} onClick={() => {
                    sendInstructionsEmail(email)
                      .then(() => setUnderText("Email sent! ✅"))
                      .catch(() => setUnderText("Something went wrong 😕"))
                  }
                  }>
                    {' '}No time now? Email me the instructions
                  </Button>
              </Box>
            {underText && <>
                <Spacer y={1}/>
                <Text>{underText}</Text>
            </>}
          </>
      }
      <Box css={{maxWidth: '700px', textAlign: 'left'}}>
        <Spacer y={3}/>
        <Collapse
          css={{border: 0, margin: "$4"}}
          shadow
          title="Why Discord?"
          subtitle="Free, community oriented & reliable"
        >
          <Text>Discord is a communication platform designed for co-creating communities online.
            It allows users to connect with each other through voice, video, and text chat.</Text>
          <Text>We use discord because it is a <b>free, open, reliable and
            easy-to-access</b> with the goal of uniting and build our own open sourced platform..</Text>
        </Collapse>
      </Box>
      <Box css={{
        position: "fixed",
        bottom: '0',
        paddingBottom: "$9"
      }}>
        <Divider/>
        <Text>By signing in & using our tool, you are accepting our
          <Link href='https://www.notion.so/hippoteam/Terms-Conditions-4f7eb4679c154b3ab8a26890ad06d9cb?pvs=4'>Terms &
            Conditions</Link>
        </Text>
      </Box>
    </Flex>)
  }
  if (session != null && status == "authenticated") {
    if (userWhitelisted == undefined) {
      return (
        <>
          <Loading>Checking if you're in our server...<br/> If this takes too long try to clear your browser
            cookies</Loading>
        </>
      )
    } else if (userInDiscord && userWhitelisted) {
      return (
        <>
          {session.user &&
              <Flex css={{
                gap: '$4',
                position: 'fixed',
                top: '10px',
                right: '10px',
              }}>
                  <Text data-testid="discord-username">{session.user!.name}</Text>
                  <Avatar
                      size="lg"
                      src={session.user!.image ?? undefined}
                      color="warning"
                      bordered
                  />
              </Flex>
          }
          {children}
        </>
      )
    } else if (userInDiscord && !userWhitelisted) {
      return (
        <>
          <Flex>
            <Text>Uh oh! You're succesfully logged in as {session.user?.name}</Text>
            <Avatar size='sm' src={session.user!.image ?? undefined} css={{marginLeft: '$2'}}/>
            <Text>,</Text>
            <Text>but it appears you don't have the required
              role <Code>{requiredRole}</Code> to access the tool 😕</Text>
            <Text>Head to this <a href="https://discord.com/channels/1022781602893414410/1022836524410220554">discord
              channel</a> to get it!</Text>
          </Flex>
        </>
      )
    } else if (!userInDiscord) {
      return (
        <>
          <Text>You're not in our discord community!</Text>
          <Text><a href="https://discord.gg/6zugVKk2sd">Click here</a> to join us! </Text>
        </>
      )
    }
  }
  return (<></>)
};

export default DiscordSessionWrapper;