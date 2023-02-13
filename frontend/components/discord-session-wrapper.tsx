import {Avatar, Button, Image, Link, Loading, Spacer, styled, Text} from '@nextui-org/react';
import {Flex} from "./styles/flex";
import {useSession, signIn} from "next-auth/react"
import {useEffect, useState} from "react";
import axios, {AxiosResponse} from "axios";
import DiscordIcon from "./icons/discord-icon";

interface LayoutProps {
  children: React.ReactNode;
}

export const Box = styled('div', {
  boxSizing: 'border-box',
});

const DiscordSessionWrapper = ({children}: LayoutProps) => {
  const [userInDiscord, setUserInDiscord] = useState<Boolean | undefined>(undefined);
  const {data: session, status} = useSession()


  useEffect(() => {
      if (session != undefined && userInDiscord == undefined) {
        axios.get("https://discord.com/api/users/@me/guilds", {
          headers: {
            // @ts-ignore
            "Authorization": `Bearer ${session?.accessToken}`
          },
        }).then((response) => {
          const guilds = response.data
          for (let guild of guilds) {
            if (guild.id == process.env.NEXT_PUBLIC_HIPPOAI_DISCORD_SERVER_ID) {
              setUserInDiscord(true)
              return
            }
          }
          setUserInDiscord(false)
        })
          .catch((error) => {
            console.log(error)
          })
      }
    }, [session, userInDiscord]
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
      <Link href='https://hippoai.org'>Terms & Conditions</Link>
    </Flex>)
  }
  if (session != null && status == "authenticated") {
    if (userInDiscord == undefined) {
      return (
        <>
          <Image src="hippo.svg" css={{width: "100px", margin: '0 auto'}}/>
          <Loading>Checking if you're in our server... If this takes too long try to clear your browser cookies</Loading>
        </>
      )
    } else if (userInDiscord) {
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
    } else {
      return (
        <>
          <Image src="hippo.svg" css={{width: "100px", margin: '0 auto'}}/>
          <Text>You're not in our discord community!</Text>
          <Link href="https://discord.gg/kgPYZsBgq5">Click here</Link> to join us!
        </>
      )
    }
  }
  return (<></>)
};

export default DiscordSessionWrapper;