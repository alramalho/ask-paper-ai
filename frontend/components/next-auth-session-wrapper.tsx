import Icon, { LoginOutlined } from '@ant-design/icons';
import {
  Avatar,
  Loading,
  Spacer,
  styled,
  Text
} from '@nextui-org/react';
import { Button, Card, Input, Space } from 'antd';
import axios from "axios";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { GuestUserContext } from "../hooks/session";
import { useMyToken } from '../pages/_app';
import { getVerifiedUser, loginAsGuest } from "../service/service";
import DiscordIcon from "./icons/discord-icon";
import { Code } from "./layout";
import OverviewBlock from "./overview-block";
import { Flex } from "./styles/flex";



interface ChildrenOnlyProps {
  children: React.ReactNode;
}

export const Box = styled('div', {
  boxSizing: 'border-box',
});

const AbsoluteCenter = styled('div', {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  flexDirection: 'column',
  gap: "$4",
  "> *": {
    margin: 0
  }
})


const NextAuthSessionWrapper = ({ children }: ChildrenOnlyProps) => {
  const [isUserLoggedInAsGuest, setIsUserLoggedInAsGuest] = useState<boolean>(false);
  const [remainingTrialRequests, setRemainingTrialRequests] = useState<number>(0);
  const [userWhitelisted, setUserWhitelisted] = useState<Boolean | undefined>(undefined);
  const [userInDiscord, setUserInDiscord] = useState<Boolean | undefined>(undefined);
  const { data: session, status } = useSession()
  const [userEmail, setUserEmail] = useState<string>('');
  const [underText, setUnderText] = useState<string | undefined>(undefined);
  const { token } = useMyToken();


  const requiredRole = 'Ask Paper Pilot'
  useEffect(() => {
    if (!isUserLoggedInAsGuest && session != undefined && userWhitelisted == undefined) {
      // @ts-ignore
      getVerifiedUser(session!.accessToken)
        .then((response) => {
          // TODO: We should move all of this to the backend and use discord.py instead of discord.js (I tried to do this but it was too much work for now)
          axios.get(`/api/discord/${requiredRole}?userId=${response.data.discord_id}`)
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

  if (isUserLoggedInAsGuest) {
    return <GuestUserContext.Provider value={{
      isUserLoggedInAsGuest,
      userEmail,
      setUserEmail,
      remainingTrialRequests,
      setRemainingTrialRequests
    }}>
      {children}
    </GuestUserContext.Provider>
  }
  if (session == null && status == "loading") {
    return (
      <AbsoluteCenter>
        <Loading>Checking if you're signed in...</Loading>
      </AbsoluteCenter>
    )
  }
  if (session == null && status == "unauthenticated") {
    return (<Flex justify='center' direction='column'>
      <Card style={{ padding: "2rem", margin: "2rem" }}>
        <h1 style={{ marginTop: '1rem', lineHeight: '5.5rem' }}>Ask Paper 📝</h1>
        <Text h4>You are not signed in!</Text>
        <Spacer y={1} />
        <Flex css={{ gap: "$8", justifyContent: "flex-start" }}>
          <Button type="primary" size="large" style={{ background: token.discordColor }} icon={<Icon component={DiscordIcon} />}
            onClick={() => signIn("discord")}>
            Join with Discord
          </Button>
          <Button size="large" icon={<Icon component={DiscordIcon} />}
            onClick={() => open("https://discord.com/register?redirect_to=https://askpaper.ai", "_self")}>
            Create discord account
          </Button>
        </Flex>
        <Text h4>or login as guest</Text>
        <Space.Compact size="large">
          <Input data-testid="guest-login-input" placeholder={"your@email.com "} value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
          <Button type="primary" data-testid="guest-login-button" icon={<LoginOutlined />} onClick={() => {
            setUnderText("Verifying login...")
            loginAsGuest(userEmail)
              .then(res => {
                setIsUserLoggedInAsGuest(true)
                setRemainingTrialRequests(res.data.remaining_trial_requests)
              })
              .catch((e) => {
                setUnderText(`Something went wrong 😕` + (e.response?.data?.detail ? ` (${e.response.data.detail})` : ''))
              })
          }
          }>Guest Login </Button>
        </Space.Compact>

        {underText && <>
          <Spacer y={1} />
          <p><em>{underText}</em></p>
        </>}

        <p style={{ marginTop: "1rem" }}><em>By signing in & using our tool, you are accepting our <a href='https://www.notion.so/hippoteam/Terms-Conditions-4f7eb4679c154b3ab8a26890ad06d9cb?pvs=4'>Terms &
          Conditions</a></em></p>
      </Card>

      <Spacer y={3} />
      <OverviewBlock />
      <Spacer y={3} />
    </Flex>)
  }
  if (session != null && status == "authenticated") {
    if (userWhitelisted == undefined) {
      return (
        <AbsoluteCenter>
          <Loading>
            Checking if you're in our server...<br />
            <p><strong>If this takes too long <Button type="text" onClick={() => signOut()}>click here</Button> to clear your browser cookies 🍪</strong></p>
          </Loading>
        </AbsoluteCenter >
      )
    } else if (userInDiscord && userWhitelisted) {
      return (
        <>
          <GuestUserContext.Provider value={{
            isUserLoggedInAsGuest,
            userEmail,
            setUserEmail,
            remainingTrialRequests,
            setRemainingTrialRequests
          }}>
            {children}
          </GuestUserContext.Provider>
        </>
      )
    } else if (userInDiscord && !userWhitelisted) {
      return (
        <AbsoluteCenter>
          <Flex>
            <Text>Uh oh! You're succesfully logged in as {session.user?.name}</Text>
            <Avatar size='sm' src={session.user!.image ?? undefined} css={{ marginLeft: '$2' }} />
            <Text>,</Text>
            <Text>but it appears you don't have the required
              role <Code>{requiredRole}</Code> to access the tool 😕</Text>
            <Text>Head to this <a href="https://discord.com/channels/1022781602893414410/1022836524410220554">discord
              channel</a> to get it!</Text>
          </Flex>
        </AbsoluteCenter>
      )
    } else if (!userInDiscord) {
      return (
        <AbsoluteCenter>
          <p>You're not in our discord community!</p>
          <p><a href="https://discord.gg/6rVU4hrc9f">Click here</a> to join us! </p>
          <br />
          <p>If you believe this is an error, <Button type="text" onClick={() => signOut()}>click here</Button></p>
          <p><small> If the error persists, please open a support ticket</small></p>
        </AbsoluteCenter>
      )
    }
  }
  return (<></>)
};

export default NextAuthSessionWrapper;