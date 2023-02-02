import {CSS, Image, styled} from '@nextui-org/react';
import {Flex} from "./styles/flex";
import { NextSeo } from 'next-seo';
import { OpenGraphMedia } from 'next-seo/lib/types';
interface LayoutProps {
  children: React.ReactNode;
  css?: CSS
  seo?: LayoutSEO
}
interface LayoutSEO {
  siteName?: string
  title: string
  description: string
  images?: ReadonlyArray<OpenGraphMedia>
}

export const Box = styled('div', {
  boxSizing: 'border-box',
});

export const Layout = ({children, css, seo}: LayoutProps) => {
  const siteName = seo?.siteName ?? 'Hippo AI Prototype'
  const title = [siteName, seo?.title].join(" ")
  const url = `https://hippo-prototype.netlify.app`
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

      {seo &&
          <NextSeo
              title={title}
              description={seo.description}
              canonical={url}
              openGraph={{
                url,
                title: title,
                description: seo.description,
                images: seo.images ?? [{url: `${url}/hippo.png`}],
                site_name: siteName,
              }}
          />
      }
      <Image src="hippo.svg" css={{width: "100px"}}/>
      {children}
    </Flex>
  )
};