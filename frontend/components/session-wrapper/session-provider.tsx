import {Avatar, CSS, styled, Text} from '@nextui-org/react';
import {Flex} from "../styles/flex";
import {useSession, signIn, signOut} from "next-auth/react"

interface LayoutProps {
  children: React.ReactNode;
}

export const Box = styled('div', {
  boxSizing: 'border-box',
});

export const SessionProvider = ({children}: LayoutProps) => {
  const {data: session} = useSession()

  if (session) {
    return (
      <>
        <Flex css={{
          gap: '$4',
          position: 'fixed',
          top: '10px',
          right: '10px',
        }}>
          <Text>{session.user!.name}</Text>
          <Avatar
            size="lg"
            src={session.user!.image}
            color="warning"
            bordered
          />
        </Flex>
        {children}
      </>
    )
  }
  return (
    <>
      <Text>Not signed in</Text>
      <button onClick={() => signIn()}>Sign in</button>
    </>
  )
};
