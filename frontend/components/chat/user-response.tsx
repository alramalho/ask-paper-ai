import { Avatar, Text } from "@nextui-org/react"
import { useSession } from "next-auth/react"
import { Box } from "../tweet-button"
import { Flex } from "../styles/flex"
import { useContext } from "react"
import { GuestUserContext, useGuestSession } from "../../hooks/session"

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
                <Text css={{ color: "white", fontSize: 'small' }}>{text}</Text>
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