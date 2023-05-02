import { Text, styled } from '@nextui-org/react';
import { WorkspaceIcon } from './icons/workspace-icon';
import { useContext } from 'react';
import { GuestUserContext, useGuestSession } from '../hooks/session';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export const Box = styled('div', {
  boxSizing: 'border-box',
});


export const MyDashboardButton = () => {
  const { isUserLoggedInAsGuest } = useContext(GuestUserContext)
  const { data: session } = isUserLoggedInAsGuest ? useGuestSession() : useSession()
  return (
      <Link href="/profile">My Assistant</Link>
  )
};
