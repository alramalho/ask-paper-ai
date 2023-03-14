import {SessionContextValue, useSession, UseSessionOptions} from "next-auth/react";
import {Session} from "next-auth";
import {createContext, useContext} from "react";
import {number} from "prop-types";

let useCustomSession = useSession

if (process.env.ENVIRONMENT !== 'production') {
  // @ts-ignore
  useCustomSession = (options?: UseSessionOptions<boolean>) => {
    const session: Session = {
      user: {
        name: 'Test User',
        // TODO: use TEST_EMAIL instead of TEST_ID
        email: (process.env.TEST_ID ?? 'local') + '@e2e.test',
        image: 'dummy',
      },
      // @ts-ignore
      accessToken: 'dummy',
      expires: 'never'
    }
    return {data: session, status: 'authenticated'} as SessionContextValue<boolean>
  }
}

type GuestUserState = {
  isUserLoggedInAsGuest: boolean
  userEmail: string
  setUserEmail?: React.Dispatch<React.SetStateAction<string>>;
  remainingTrialRequests: number
  setRemainingTrialRequests?: React.Dispatch<React.SetStateAction<number>>;
}

export const GuestUserContext = createContext<GuestUserState>({
  isUserLoggedInAsGuest: false,
  userEmail: '',
  setUserEmail: () => {},
  remainingTrialRequests: 0,
  setRemainingTrialRequests: undefined,
})

export const useGuestSession = (options?: UseSessionOptions<boolean>) => {
  const {userEmail} = useContext(GuestUserContext)
  const session: Session = {
    user: {
      name: 'Guest User',
      // TODO: use TEST_EMAIL instead of TEST_ID
      email: userEmail,
      // @ts-ignore
      accessToken: 'dummy',
      image: 'dummy',
    },
    expires: 'never'
  }
  return {data: session, status: 'authenticated'} as SessionContextValue<boolean>
}


export default useCustomSession
