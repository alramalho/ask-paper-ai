import { Text } from "@nextui-org/react"
import { Box } from "../sponsor-button"
import { Flex } from "../styles/flex"

const UserResponse = ({ text }: { text: string }) => {
    return (
        <Flex css={{ margin: '$6', gap: "$5", flexWrap: 'nowrap', overflow: 'visible', justifyContent: 'flex-end' }}>
            <Box css={{
                textAlign: 'left',
                backgroundColor: '$primaryLight',
                border: '1px solid $primary',
                padding: '$6 $10',
                borderRadius: '20px 20px 0 20px',
            }}>
                <Text css={{color: "black"}}>{text}</Text>
            </Box>
        </Flex>
    )
}

export default UserResponse