import { Avatar, Text } from "@nextui-org/react"
import { Box } from "../tweet-button"
import { Flex } from "../styles/flex"

const SystemResponse = ({ text }: { text: string }) => {

    return (
        <Flex css={{ margin: '$6', gap: "$5", flexWrap: 'nowrap', overflow: 'visible', justifyContent: 'flex-end', flexDirection: "row-reverse" }}>
            <Box css={{
                textAlign: 'left',
                backgroundColor: '$backgroundLighter',
                border: '1px solid $gray600',
                padding: '$4 $8',
                borderRadius: '20px 20px 20px 0',
            }}>
                <Text i css={{ color: "black", fontSize: 'small' }}>{text}</Text>
            </Box>
            <Avatar
                size="md"
                src={"/note.png"}
                color="warning"
                bordered
            />
        </Flex>
    )
}

export default SystemResponse