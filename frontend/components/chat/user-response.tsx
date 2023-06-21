import { Avatar } from "@nextui-org/react"
import { useSession } from "next-auth/react"
import { useContext } from "react"
import MarkdownView from "react-showdown"
import { GuestUserContext, useGuestSession } from "../../hooks/session"
import { Flex } from "../styles/flex"
import { Box } from "../tweet-button"

const UserResponse = ({ text }: { text: string }) => {
    const { isUserLoggedInAsGuest } = useContext(GuestUserContext)
    const { data: session } = isUserLoggedInAsGuest ? useGuestSession() : useSession()

    return (
        <Flex css={{ margin: '$6', gap: "$5", flexWrap: 'nowrap', overflow: 'visible', justifyContent: 'flex-end' }}>
            <Box css={{
                textAlign: 'left',
                backgroundColor: '$blue500',
                border: '1px solid $blue500',
                padding: '$4 $8',
                borderRadius: '20px 20px 0 20px',
            }}>
                <MarkdownView
                    style={{ color: "white", fontSize: 'small' }}
                    markdown={text}
                    options={{ tables: true, emoji: true, }}
                />
            </Box>
            <Avatar
                size="md"
                src={session!.user!.image ?? undefined}
                color="warning"
                bordered
            />
        </Flex>
    )
}

export default UserResponse