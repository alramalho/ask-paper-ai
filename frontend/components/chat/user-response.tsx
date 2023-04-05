import { Avatar, Text } from "@nextui-org/react"
import { useSession } from "next-auth/react"
import { Box } from "../sponsor-button"
import { Flex } from "../styles/flex"

const UserResponse = ({ text }: { text: string }) => {
    const { data: session, status } = useSession()
    return (
        <Flex css={{ margin: '$6', gap: "$5", flexWrap: 'nowrap', overflow: 'visible', justifyContent: 'flex-end' }}>
            <Box css={{
                textAlign: 'left',
                backgroundColor: '$blue500',
                border: '1px solid $blue500',
                padding: '$6 $10',
                borderRadius: '20px 20px 0 20px',
            }}>
                <Text css={{ color: "white" }}>{text}</Text>
            </Box>
            <Avatar
                size="lg"
                src={session!.user!.image ?? undefined}
                color="warning"
                bordered
            />
        </Flex>
    )
}

export default UserResponse