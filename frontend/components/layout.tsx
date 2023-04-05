import { CSS, Image, styled, Text } from '@nextui-org/react';
import { Flex } from "./styles/flex";
import { NextSeo } from 'next-seo';
import { OpenGraphMedia } from 'next-seo/lib/types';
import { TweetButton } from "./sponsor-button";
import React from "react";

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

export const Layout = ({ children, css, seo }: LayoutProps) => {
  const siteName = seo?.siteName ?? 'Ask Paper BETA'
  const title = [siteName, seo?.title].join(" ")
  const url = `https://www.askpaper.ai`
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
      {children}
    </>
  )
};
