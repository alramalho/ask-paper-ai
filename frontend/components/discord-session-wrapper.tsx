import {Avatar, Button, Image, Link, Loading, Spacer, styled, Text} from '@nextui-org/react';
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

  const requiredRole = 'Pilot'
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
        <Image src="hippo.svg" css={{width: "100px", margin: '0 auto'}}/>

        <Loading>Checking if you're signed in...</Loading>
      </>
    )
  }
  if (session == null && status == "unauthenticated") {
    return (<Flex justify='center' direction='column'>
      <Image src="hippo.svg" css={{width: "100px", margin: '0 auto'}}/>

      <Text h4>You are not signed in!</Text>
      <Spacer y={1}/>
      <Button css={{backgroundColor: '$discordColor'}} icon={<DiscordIcon/>} onClick={() => signIn("discord")}>Sign in
        with Discord
      </Button>
      <Spacer/>
      <Text>By signing in & using our tool, you are accepting our</Text>
      <Link href='https://www.notion.so/hippoteam/Terms-Conditions-4f7eb4679c154b3ab8a26890ad06d9cb?pvs=4'>Terms & Conditions</Link>
    </Flex>)
  }
  if (session != null && status == "authenticated") {
    if (userWhitelisted == undefined) {
      return (
        <>
          <Image src="hippo.svg" css={{width: "100px", margin: '0 auto'}}/>
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
          <Image src="hippo.svg" css={{width: "100px", margin: '0 auto'}}/>
          <Text>Uh oh! Currently only users with the <Code>{requiredRole}</Code> role can access the tool 😕</Text>
          <Text> Talk to one of our moderators if you're interested in participating! </Text>
        </>
      )
    } else if (!userInDiscord){
      return (
        <>
          <Image src="hippo.svg" css={{width: "100px", margin: '0 auto'}}/>
          <Text>You're not in our discord community!</Text>
          <Text><a href="https://discord.gg/6zugVKk2sd">Click here</a> to join us! </Text>
        </>
      )
    }
  }
  return (<></>)
};

export default DiscordSessionWrapper;