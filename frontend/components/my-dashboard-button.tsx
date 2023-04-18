import {Button, styled} from '@nextui-org/react';
import { WorkspaceIcon } from './icons/workspace-icon';
import { useContext } from 'react';
import { GuestUserContext, useGuestSession } from '../hooks/session';
import { useSession } from 'next-auth/react';

export const Box = styled('div', {
  boxSizing: 'border-box',
});


export const MyDashboardButton = () => {
  const {isUserLoggedInAsGuest} = useContext(GuestUserContext)
  const {data: session} = isUserLoggedInAsGuest ? useGuestSession() : useSession()
  return (

    <Button
      auto
      as="a"
      css={{
        bg: "$gray50",
        color: "$text",
        maxH: "38px",
        px: "$8",
        "& .nextui-button-icon": {
          mr: "$2",
        },
        "& .nextui-button-icon svg": {
          transition: "$default",
        },
        "&:hover": {
          "& .nextui-button-icon svg": {
            transform: "scale(1.2)",
          },
        },
        zIndex: 10,
      }}
      href={`/profile`}
      icon={<WorkspaceIcon filled fill="#aaaaaa" size={20}/>}
      size="sm"

    >
      Dashboard
    </Button>
  )
};
