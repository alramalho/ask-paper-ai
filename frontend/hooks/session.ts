import {SessionContextValue, useSession, UseSessionOptions} from "next-auth/react";
import {Session} from "next-auth";

let useCustomSession = useSession

if (process.env.ENVIRONMENT !== 'production') {
  // @ts-ignore
  useCustomSession = (options?: UseSessionOptions<boolean>) => {
    const session: Session = {
      user: {
        name: 'Test User',
        // TODO: use TEST_EMAIL instead of TEST_ID
        email: (process.env.TEST_ID ?? '') + '@e2e-test',
        image: 'dummy',
      },
      expires: 'never'
    }
    return {data: session, status: 'authenticated'} as SessionContextValue<boolean>
  }
}

export default useCustomSession
