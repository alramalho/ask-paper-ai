import {CSS, Image, styled} from '@nextui-org/react';
import {Flex} from "./styles/flex";

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
      <Image src="hippo.svg" css={{width: "100px"}}/>
      {children}
    </Flex>
  )
};
