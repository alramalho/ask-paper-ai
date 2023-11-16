import { Button, Slider } from 'antd'
import { Flex } from './styles/flex'
import { StyledLabel } from './feedback-modal'

const Nps = (props) => {

    return <>
        <Flex direction='column'>
            {/* todo: can we make this more accessbile? */}
            <StyledLabel>How likely are you to recommend Ask Paper to friends or colleagues?</StyledLabel>
            <Flex data-testid="nps-select" css={{gap: "$4"}}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                    <Button key={value} type={props.value === value ? 'primary' : undefined} onClick={() => props.onChange(value)}>
                        {value}
                    </Button>
                ))}
            </Flex>
        </Flex>
    </>
}

export default Nps