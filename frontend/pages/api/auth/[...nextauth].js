import NextAuth from "next-auth"
import DiscordProvider from "next-auth/providers/discord"

export const authOptions = {
    providers: [
        DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
            callbackUrl: process.env.NEXTAUTH_URL + "/api/auth/callback/discord",
            token: "https://discord.com/api/oauth2/token",
            userinfo: "https://discord.com/api/users/@me",
            authorization: {
                params: {
                    scope: 'identify email'
                }
            },
        }),
    ],
    callbacks: {
        async session({ session, token, user }) {
            if (process.env.ENVIRONMENT === "sandbox") {
                session.accessToken = 'dummy'
            } else {
                session.accessToken = token.accessToken
            }
            return session;
        },

        async jwt({ token, account }){
            if (account){
                token.accessToken = account.access_token
            }
            return token;
        }
    },
    secret: process.env.NEXTAUTH_SECRET
}

export default NextAuth(authOptions)