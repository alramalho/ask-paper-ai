import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
    interface Session {
        accessToken: string
        & DefaultSession['user']
    }
}