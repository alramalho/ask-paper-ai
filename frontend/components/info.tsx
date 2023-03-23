import { InfoCircleOutlined } from '@ant-design/icons';
import {Text} from "@nextui-org/react";
import { Flex } from './styles/flex';

const Info = ({ text }) => {
    return (
        <Flex css={{borderRadius: '5px', background: "$backgroundLighter", border: "1px solid $gray200", padding: "$3", gap: "$2", marginTop: "$4"}}>
            <InfoCircleOutlined style={{color: "$gray800"}}/>
            <Text small css={{color: "$gray800"}}>{text}</Text>
        </Flex>
    )
}

export default Info