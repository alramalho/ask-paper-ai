import { CSS, Text, styled } from '@nextui-org/react';
import { NextSeo } from 'next-seo';
import { OpenGraphMedia } from 'next-seo/lib/types';
import React, { Dispatch, SetStateAction, useContext, useEffect, useState } from "react";
import FeedbackModal from './feedback-modal';
import { GuestUserContext, useGuestSession } from '../hooks/session';
import { useSession } from 'next-auth/react';
import { Avatar, Layout, Menu, MenuProps } from 'antd';
const { Sider, Content, Footer, Header } = Layout;
import Icon, { BulbFilled, BulbTwoTone, DotChartOutlined, ExperimentOutlined, TwitterOutlined, UserOutlined } from "@ant-design/icons";
import Link from 'next/link';
import DiscordIcon from './icons/discord-icon';
import { Flex } from './styles/flex';

type MenuItem = Required<MenuProps>['items'][number];

const twitterLink = "https://twitter.com/intent/tweet?text=%F0%9F%93%9D+askpaper.ai+-+Understand+any+paper%21%0D%0ACurrently+in+love+with+this+new+AI+tool.+It+let%27s+you+ask+open+questions%2C+generate+great+summaries+%26+extract+data+from+papers.+%0D%0APerfect+for+researchers+trying+to+ramp+up+their+paper+reading+game%21+"

interface MyLayoutProps {
  children: React.ReactNode;
  css?: CSS
  seo?: MyLayoutSEO
}

interface MyLayoutSEO {
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

export const Div = styled('div')
export const A = styled('a', {
  color: 'inherit',
  textDecoration: 'underline',
  '&:hover': {
    textDecoration: 'none',
    color: 'inherit',
  },
})
export const FeedbackVisibleContext = React.createContext<Dispatch<SetStateAction<boolean>>>(() => { })

export const MyLayout = ({ children, css, seo }: MyLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);

  const siteName = seo?.siteName ?? 'Ask Paper – Extract Data & Insights '
  const title = [siteName, seo?.title].join(" ")
  const url = `https://www.askpaper.ai`

  const [isFeedbackModalVisible, setIsFeedbackModalVisible] = useState<boolean>(false)
  const { isUserLoggedInAsGuest } = useContext(GuestUserContext)
  const { data: session, status } = isUserLoggedInAsGuest ? useGuestSession() : useSession()

  function getItem(
    label: React.ReactNode,
    key: React.Key,
    icon?: React.ReactNode,
    onClick?: string | (() => void),
  ): MenuItem {
    if (typeof onClick == "string") {
      return {
        key,
        icon,
        label: (
          <Link href={onClick} >{label}</Link>
        )
      } as MenuItem;
    } else if (typeof onClick == "function") {
      return {
        key,
        icon,
        label: (
          <span onClick={onClick} >{label}</span>
        )
      } as MenuItem;
    }
    return {
      key,
      icon,
      label,
    } as MenuItem;
  }

  const items: MenuItem[] = [
    getItem('App', '1', <ExperimentOutlined />, "/"),
    getItem('My Dashboard', '2', <DotChartOutlined />, "/profile"),
    getItem('Go To Community', '3', <Icon component={DiscordIcon} />),
    getItem('Share on Twittter', '4', <TwitterOutlined />, twitterLink),
    getItem('Feedback?', '5', <BulbTwoTone twoToneColor={"orange"} />, () => setIsFeedbackModalVisible(true)),
  ];


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
        <Layout style={{ minHeight: "100vh" }}>
          <Header className="header" style={{ backgroundColor: "white" }} >
            {/* todo: get rid of this flex bullshit. supposedly isnt' needed */}
            <Flex direction="row" css={{ flexWrap: "nowrap", maxHeight: "100%", justifyContent: "space-between" }}>
              <h4>Ask Paper 📝</h4>

              <Menu mode="horizontal" defaultSelectedKeys={['1']} items={items} style={{ float: "right" }} />
            </Flex>
          </Header>
          <Content style={{ padding: '0 50px' }}>
            <Layout style={{ padding: '24px 0', margin: '24px 0', backgroundColor: "white" }}>
              {children}
            </Layout>
          </Content>
          <Footer style={{ textAlign: 'center' }}>An <A href="https://hippoai.dev">hippoai.dev</A> product</Footer>
        </Layout>
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
        </>
      }/
    </>
  )
};
