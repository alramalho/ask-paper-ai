import {SessionContextValue, useSession, UseSessionOptions} from "next-auth/react";
import {Session} from "next-auth";

let useCustomSession = useSession

if (process.env.ENVIRONMENT !== 'production') {
  // @ts-ignore
  useCustomSession = (options?: UseSessionOptions<boolean>) => {
    const session: Session = {
      user: {
        name: 'Test User',
        email: 'e2e-test',
        image: 'dummy',
      },
      expires: 'never'
    }
    return {data: session, status: 'authenticated'} as SessionContextValue<boolean>
  }
}

export default useCustomSession
