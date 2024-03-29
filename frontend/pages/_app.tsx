import { createTheme } from '@nextui-org/react';
import { ConfigProvider, theme } from 'antd';
import { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { AppProps } from 'next/app';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { MyLayout } from "../components/layout";
import NextAuthSessionWrapper from "../components/next-auth-session-wrapper";
import { SEO } from '../components/seo';
import '../styles/globals.scss';

const primaryColor = "#ff6372"
const discordColor = "#5865F2"
export const lightTheme = createTheme({
  type: 'light',
  theme: {
    colors: {
      backgroundLighter: '#fcfcfc',
      background: '#f2f2f2',
      backgroundDarker: '#efefef',
      discordColor: discordColor,
      primary: primaryColor,
      primaryLight: '#ffccd1',
      primaryLightHover: '#f8b2b9', // commonly used on hover state
      primaryLightActive: '#f8939e', // commonly used on pressed state
      primaryLightContrast: '#fa495a', // commonly used for text inside the component
      primaryBorder: '#f67581',
      primaryBorderHover: '#ff6372',
      primarySolidHover: '#f63e4f',
      primarySolidContrast: '$white', // commonly used for text inside the component
      primaryShadow: '#f67581',
      hippo1: "#ff6e9e",
      hippo1light: "#f598b7",
      hippo1dark: "#a1254e",
      hippo1dim: "#FB3CA433",
      hippo2: "#ff3a4e",
      hippoGradient: "linear-gradient(45deg, var(--nextui-colors-hippo1) 20%, var(--nextui-colors-hippo2) 100%);"
    },
  },
});

export const useMyToken = () => {
  const { token } = theme.useToken();
  return {
    token: {
      ...token,
      discordColor
    }
  };
}

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps<{ session: Session }>) {

  return (
    <SessionProvider session={session}>
      <NextThemesProvider
        defaultTheme="light"
        attribute="class"
        value={{
          light: lightTheme.className,
        }}
      >
        {/* <NextUIProvider> */}
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: primaryColor,
            },
          }}
        >
          <SEO />
          <NextAuthSessionWrapper>
            <MyLayout >
              <Component {...pageProps} />
            </MyLayout>
          </NextAuthSessionWrapper>
        </ConfigProvider>
        {/* </NextUIProvider> */}
      </NextThemesProvider>
    </SessionProvider>
  )
    ;
}

export default MyApp;
