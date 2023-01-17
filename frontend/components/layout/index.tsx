import {CSS, styled} from '@nextui-org/react';
import {Flex} from "../styles/flex";

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
      css={{
        maxW: '100%',
        background: '$background',
        ...css
      }}
    >
      {children}
    </Flex>
  )
};
