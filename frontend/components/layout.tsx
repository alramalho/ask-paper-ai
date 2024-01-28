import Icon, { BulbTwoTone, ChromeOutlined, DotChartOutlined, ExperimentOutlined, LogoutOutlined, TwitterOutlined } from "@ant-design/icons";
import { styled } from '@nextui-org/react';
import { Layout, Menu, MenuProps } from 'antd';
import { signOut, useSession } from 'next-auth/react';
import Router from "next/router";
import React, { Dispatch, SetStateAction, useContext, useState } from "react";
import { GuestUserContext, useGuestSession } from '../hooks/session';
import FeedbackModal from './feedback-modal';
import DiscordIcon from './icons/discord-icon';
import { Flex } from './styles/flex';
const { Sider, Content, Footer, Header } = Layout;


type MenuItem = Required<MenuProps>['items'][number];

const twitterLink = "https://twitter.com/intent/tweet?text=%F0%9F%93%9D%20Stumbled%20upon%20askpaper.ai%20and%20it%27s%20changing%20how%20I%20interact%20with%20papers.%20It%20allows%20you%20to%20ask%20questions%2C%20generate%20insightful%20summaries%2C%20and%20pull%20out%20crucial%20data%20points.%20Essential%20for%20any%20researcher%20looking%20to%20up%20their%20reading%20game.%20Check%20it%20out%21%20%F0%9F%91%8D%0A%40hippoai%20%40_alexramalho%20"

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
    getItem('Browser Extension', '6', <ChromeOutlined />, "https://chrome.google.com/webstore/detail/askpaper-%E2%80%93-research-chatg/eabkffkifnfojefnnoohamhdfjajgepm?hl=en&authuser=1" ),
    getItem('Feedback?', '5', <BulbTwoTone twoToneColor={"orange"} />, () => setIsFeedbackModalVisible(true)),
    getItem('Community', '3', <Icon component={DiscordIcon} />, "https://discord.gg/6rVU4hrc9f"),
    getItem('Share', '4', <TwitterOutlined />, twitterLink),
    getItem('Logout', '7', <LogoutOutlined />, () => signOut()),
  ];


  return (
    <>
      <FeedbackVisibleContext.Provider value={setIsFeedbackModalVisible}>
        <Layout style={{ minHeight: "100vh" }}>
          <Header className="header" style={{
            overflow: 'auto',
            backgroundColor: "white", position: "fixed", width: "100%", zIndex: 100, height: `${headerHeight}px`,
            borderBottom: "1px solid gainsboro"
          }} >
            {/* todo: get rid of this flex bullshit. supposedly isnt' needed */}
            <Flex direction="row" css={{ flexWrap: "nowrap", maxHeight: "100%", justifyContent: "space-between" }}>
              {isDesktop() && <h4>Ask Paper 📝</h4>}
              <Menu mode="horizontal" selectedKeys={[window.location.pathname]} items={items} style={{ justifyContent: "flex-end", float: "right", borderColor: "gainsboro", minWidth: '600px', borderBottom: 0 }} />
            </Flex>
          </Header>
          <Content style={{ padding: `0 ${isMobile() ? '0' : '24'}px`, marginTop: "64px" }}>
            <Layout style={{ margin: `${layoutMargin}px 0` }}>
              {children}
            </Layout>
          </Content>
          <Footer style={{ textAlign: 'center' }}>
            <p>Follow the <A href="https://twitter.com/_alexramalho">dev</A> (news coming soon!)</p>
            <p>Powered by <A href="https://hippoai.org">Hippo AI Foundation</A></p>
            </Footer>
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
