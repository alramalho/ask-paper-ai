import NextAuth from "next-auth"
import DiscordProvider from "next-auth/providers/discord"

export const authOptions = {
    providers: [
        DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
            token: "https://discord.com/api/oauth2/token",
            userinfo: "https://discord.com/api/users/@me",
            authorization: {
                params: {
                    scope: 'identify email guilds'
                }
            },
        }),
    ],
    callbacks: {
        async session({ session, token, user }) {
            session.accessToken = token.accessToken
            return session;
        },

        async jwt({ token, account }){
            if (account){
                token.accessToken = account.access_token
            }
            return token;
        }
    },
}

export default NextAuth(authOptions)