import { CSS, Text, styled } from '@nextui-org/react';
import { NextSeo } from 'next-seo';
import { OpenGraphMedia } from 'next-seo/lib/types';
import React, { Dispatch, SetStateAction, useContext, useEffect, useState } from "react";
import FeedbackModal from './feedback-modal';
import { GuestUserContext, useGuestSession } from '../hooks/session';
import { useSession } from 'next-auth/react';

interface LayoutProps {
  children: React.ReactNode;
  css?: CSS
  seo?: LayoutSEO
}

interface LayoutSEO {
  siteName?: string
  title?: string
  description: string
  images?: ReadonlyArray<OpenGraphMedia>
}

export const Code = styled('code', {

})
export const Box = styled('div', {
  boxSizing: 'border-box',
});

export const FeedbackVisibleContext = React.createContext<Dispatch<SetStateAction<boolean>>>(() => { })

export const Layout = ({ children, css, seo }: LayoutProps) => {
  const siteName = seo?.siteName ?? 'Ask Paper – Extract Data & Insights '
  const title = [siteName, seo?.title].join(" ")
  const url = `https://www.askpaper.ai`

  const [isFeedbackModalVisible, setIsFeedbackModalVisible] = useState<boolean>(false)
  const { isUserLoggedInAsGuest } = useContext(GuestUserContext)
  const { data: session, status } = isUserLoggedInAsGuest ? useGuestSession() : useSession()

  return (
    <>
      {seo &&
        <NextSeo
          title={title}
          description={seo.description}
          canonical={url}
          openGraph={{
            url,
            title: title,
            description: seo.description,
            images: seo.images ?? [{ url: `${url}/demo.png` }, { url: `${url}/hippo.png` }],
            site_name: siteName,
          }}
        />
      }
      <FeedbackVisibleContext.Provider value={setIsFeedbackModalVisible}>
        {children}
      </FeedbackVisibleContext.Provider>
      {session != null && status == "authenticated" &&
        <>
          {isFeedbackModalVisible &&
            <FeedbackModal
              userEmail={session!.user!.email!}
              visible={isFeedbackModalVisible}
              setVisible={setIsFeedbackModalVisible}
            />
          }
          <Box data-testid='feedback-component' css={{
            position: 'absolute',
            bottom: '0',
            right: '10px',
            padding: '$4',
            backgroundColor: '$primary',
            border: "1px solid $primaryLightContrast",
            zIndex: 50,
            color: 'white',
            borderRadius: '15px 15px 0 0',
            cursor: 'pointer',
          }} onClick={() => setIsFeedbackModalVisible(true)}>
            <Text b css={{ color: 'inherit' }}>👋 Feedback?</Text>
          </Box>
        </>
      }
    </>
  )
};
