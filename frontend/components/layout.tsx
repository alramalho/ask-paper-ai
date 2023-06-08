import { CSS, Text, styled } from '@nextui-org/react';
import { NextSeo } from 'next-seo';
import { OpenGraphMedia } from 'next-seo/lib/types';
import React, { Dispatch, SetStateAction, useContext, useEffect, useState } from "react";
import FeedbackModal from './feedback-modal';
import { GuestUserContext, useGuestSession } from '../hooks/session';
import { useSession } from 'next-auth/react';
import { Avatar, Divider, Layout, Menu, MenuProps, } from 'antd';
const { Sider, Content, Footer, Header } = Layout;
import Icon, { BulbFilled, BulbTwoTone, DotChartOutlined, ExperimentOutlined, TwitterOutlined } from "@ant-design/icons";
import Link from 'next/link';
import DiscordIcon from './icons/discord-icon';
import { Flex } from './styles/flex';
import Router from "next/router";


type MenuItem = Required<MenuProps>['items'][number];

const twitterLink = "https://twitter.com/intent/tweet?text=%F0%9F%93%9D+askpaper.ai+-+Understand+any+paper%21%0D%0ACurrently+in+love+with+this+new+AI+tool.+It+let%27s+you+ask+open+questions%2C+generate+great+summaries+%26+extract+data+from+papers.+%0D%0APerfect+for+researchers+trying+to+ramp+up+their+paper+reading+game%21+"

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

export const isMobile = () => {
  if (typeof window !== 'undefined') {
    return window.innerWidth < 768
  }
  return false
}

export const isTablet = () => {
  if (typeof window !== 'undefined') {
    return window.innerWidth > 768 && window.innerWidth < 1024
  }
  return false
}

export const isDesktop = () => {
  if (typeof window !== 'undefined') {
    return window.innerWidth > 1024
  }
  return false
}

export const FeedbackVisibleContext = React.createContext<Dispatch<SetStateAction<boolean>>>(() => { })

export const layoutMargin = 0
export const headerHeight = 66

export const MyLayout = ({ children }) => {

  const [isFeedbackModalVisible, setIsFeedbackModalVisible] = useState<boolean>(false)
  const { isUserLoggedInAsGuest } = useContext(GuestUserContext)
  const [collapsed, setCollapsed] = useState(false)
  const { data: session, status } = isUserLoggedInAsGuest ? useGuestSession() : useSession()

  function getItem(
    label: React.ReactNode,
    key: React.Key,
    icon?: React.ReactNode,
    click?: string | (() => void),
  ): MenuItem {
    if (typeof click == "string") {
      return {
        key,
        icon,
        label: (
          <span onClick={() => Router.push(click)} >{label}</span>
        )
      } as MenuItem;
    } else if (typeof click == "function") {
      return {
        key,
        icon,
        label: (
          <span onClick={click} >{label}</span>
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
    getItem('App', '/', <ExperimentOutlined />, "/"),
    getItem('My Dashboard', '/profile', <DotChartOutlined />, "/profile"),
    getItem('Feedback?', '5', <BulbTwoTone twoToneColor={"orange"} />, () => setIsFeedbackModalVisible(true)),
    getItem('Community', '3', <Icon component={DiscordIcon} />, "https://discord.gg/6rVU4hrc9f"),
    getItem('Share', '4', <TwitterOutlined />, twitterLink),
  ];


  return (
    <>
      <FeedbackVisibleContext.Provider value={setIsFeedbackModalVisible}>
        <Layout style={{ minHeight: "100vh" }} hasSider>
          <Sider theme='light' collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)} style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
          }}>
            {/* todo: get rid of this flex bullshit. supposedly isnt' needed */}
            <Flex direction="column" css={{ flexWrap: "nowrap", maxWidth: "100%", height: "100%", maxHeight: "100%", justifyContent: "space-between" }}>
              {isDesktop() && <h3 style={{ padding: "10px" }}>{collapsed ? "" : "Ask Paper"} 📝</h3>}
              <Menu mode="vertical" selectedKeys={[window.location.pathname]} items={items} style={{ width: '100%', borderTop: "1px solid gainsboro" }} />
            </Flex>
          </Sider>
          <Layout style={{ marginLeft: collapsed ? 80 : 200 }} > 
            <Content style={{ padding: `0 ${isMobile() ? '0' : '24'}px` }}>
              <Layout>
                {children}
              </Layout>
            </Content>
            <Footer style={{ textAlign: 'center' }}>This product is powered by the <A href="https://hippoai.org">Hippo AI Foundation</A></Footer>
          </Layout>
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
      }
    </>
  )
};
