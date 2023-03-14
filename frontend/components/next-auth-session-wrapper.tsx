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
import {GuestUserContext} from "../hooks/session";
import ProfileInfo from "./profile-info";
import OverviewBlock from "./overview-block";


interface ChildrenOnlyProps {
  children: React.ReactNode;
}

export const Box = styled('div', {
  boxSizing: 'border-box',
});

const NextAuthSessionWrapper = ({children}: ChildrenOnlyProps) => {
  const [isUserLoggedInAsGuest, setIsUserLoggedInAsGuest] = useState<boolean>(false);
  const [remainingTrialRequests, setRemainingTrialRequests] = useState<number>(0);
  const [userWhitelisted, setUserWhitelisted] = useState<Boolean | undefined>(undefined);
  const [userInDiscord, setUserInDiscord] = useState<Boolean | undefined>(undefined);
  const {data: session, status} = useSession()
  const [userEmail, setUserEmail] = useState<string>('');
  const [underText, setUnderText] = useState<string | undefined>(undefined);

  function loginAsGuest(email) {
    return axios.post(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/guest-login`, {}, {
      headers: {
        "Email": email,
      }
    })
  }

  function sendInstructionsEmail(recipient) {
    return axios.post(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/send-instructions-email`, {
      "recipient": recipient,
    })
  }

  const requiredRole = 'Ask Paper Pilot'
  useEffect(() => {
      if (!isUserLoggedInAsGuest && session != undefined && userWhitelisted == undefined) {
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
      <>
        <Loading>Checking if you're signed in...</Loading>
      </>
    )
  }
  if (session == null && status == "unauthenticated") {
    return (<Flex justify='center' direction='column'>

      <Text h4>You are not signed in!</Text>
      <Spacer y={1}/>
      <Flex css={{gap: "$8"}}>
        <Button size="lg" css={{backgroundColor: '$discordColor'}} icon={<DiscordIcon/>}
                onClick={() => signIn("discord")}>
          Join with Discord
        </Button>
        <Button css={{paddingLeft: "$16"}} size="lg" bordered color="secondary" icon={<DiscordIcon/>}
                onClick={() => open("https://discord.com/register?redirect_to=https://askpaper.ai", "_self")}>
          Create discord account
        </Button>
      </Flex>
      <Spacer y={2}/>
      <Text b css={{marginBottom: "$2"}}>or</Text>
      <Box>
        <Input
          // @ts-ignore
          css={{
            minWidth: "100%",
            padding: "0",
            margin: "0",
          }} placeholder="Email" initialValue={userEmail} onChange={(e) => setUserEmail(e.target.value)}/>
        <Button size="lg" auto bordered color="error" css={{
          marginTop: "$4",
          backgroundColor: 'transparent',
          textTransform: 'uppercase',
        }} icon={<Text>📩</Text>} onClick={() => {
          setUnderText("Verifying login...")
          loginAsGuest(userEmail)
            .then(res => {
              setIsUserLoggedInAsGuest(true)
              setRemainingTrialRequests(res.data.remaining_trial_requests)
            })
            .catch((e) => setUnderText(`Something went wrong 😕`))
        }
        }>
          {' '}Or login as guest user *
        </Button>
        <Spacer y={1}/>
      </Box>
      <Text i>* Guest users have a limited number of requests</Text>
      {underText && <>
          <Spacer y={1}/>
          <Text>{underText}</Text>
      </>}
      <Spacer y={3}/>
      <OverviewBlock/>
      <Spacer y={7}/>
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
        <Loading>
          Checking if you're in our server...<br/>
          If this takes too long try to clear your browsercookies
        </Loading>
      )
    } else if (userInDiscord && userWhitelisted) {
      return (
        <GuestUserContext.Provider value={{
          isUserLoggedInAsGuest: false,
          userEmail: '',
          remainingTrialRequests: 0,
          setRemainingTrialRequests: undefined,
        }}>
          {session.user &&
              <ProfileInfo name={session!.user!.name} imageURL={session!.user!.image}/>
          }
          {children}
        </GuestUserContext.Provider>
      )
    } else if (userInDiscord && !userWhitelisted) {
      return (
        <Flex>
          <Text>Uh oh! You're succesfully logged in as {session.user?.name}</Text>
          <Avatar size='sm' src={session.user!.image ?? undefined} css={{marginLeft: '$2'}}/>
          <Text>,</Text>
          <Text>but it appears you don't have the required
            role <Code>{requiredRole}</Code> to access the tool 😕</Text>
          <Text>Head to this <a href="https://discord.com/channels/1022781602893414410/1022836524410220554">discord
            channel</a> to get it!</Text>
        </Flex>
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

export default NextAuthSessionWrapper;