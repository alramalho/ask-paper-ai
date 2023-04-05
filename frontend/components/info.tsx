import { InfoCircleOutlined } from '@ant-design/icons';
import { Text } from "@nextui-org/react";
import { Flex } from './styles/flex';

const Info = ({ text }) => {
    return (
        <Flex css={{ borderRadius: '7px', background: "transparent", border: "1px solid $gray500", padding: "$3", gap: "$2", margin: "$2 auto" }}>
            <InfoCircleOutlined style={{ color: "$gray800" }} />
            <Text small css={{ color: "$gray800" }}>{text}</Text>
        </Flex>
    )
}

export default Info