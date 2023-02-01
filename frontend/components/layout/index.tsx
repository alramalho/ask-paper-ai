import {CSS, styled} from '@nextui-org/react';
import {Flex} from "../styles/flex";
import { useSession, signIn, signOut } from "next-auth/react"

interface LayoutProps {
  children: React.ReactNode;
  css?: CSS
}

export const Box = styled('div', {
  boxSizing: 'border-box',
});

export const Layout = ({children, css}: LayoutProps) => {
  return (
    <Flex
      justify="center"
      align="center"
      direction="column"
      css={{
        minHeight: '100%',
        maxWidth: '100vw',
        background: '$background',
        ...css
      }}
    >
      {children}
    </Flex>
  )
};
