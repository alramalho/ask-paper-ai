import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { Session } from "next-auth";
import { createTheme, NextUIProvider, Text } from '@nextui-org/react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { SessionProvider } from "next-auth/react";
import NextAuthSessionWrapper from "../components/next-auth-session-wrapper";
import { Layout } from "../components/layout";
import { ConfigProvider } from 'antd';
import { theme } from "antd"
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

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
        <NextUIProvider>
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: primaryColor,
              },
            }}
          >
            <NextAuthSessionWrapper>
              <Layout seo={{
                description: "Ask questions & Extract datasets from papers."
              }}>
                <Component {...pageProps} />
              </Layout>
            </NextAuthSessionWrapper>
          </ConfigProvider>
        </NextUIProvider>
      </NextThemesProvider>
    </SessionProvider>
  )
    ;
}

export default MyApp;
