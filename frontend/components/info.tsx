import { InfoCircleOutlined } from '@ant-design/icons';
import { Text } from "@nextui-org/react";
import { Flex } from './styles/flex';

const Info = (props) => {
    return (
        <Flex css={{ borderRadius: '7px', background: "transparent", border: "1px solid $gray500", padding: "$3", gap: "$2", margin: "$2 auto", flexWrap: 'nowrap', flexDirection: "row", ...props.css }} >
            <InfoCircleOutlined style={{ color: "$gray800" }} />
            {props.text && <Text small css={{ color: "$gray800" }}>{props.text}</Text>}
            {props.children}
        </Flex>
    )
}

export default Info