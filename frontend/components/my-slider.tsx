import {Slider} from 'antd'

const MySlider = (props) => {
    const marks = {
        1: '1',
        2: '2',
        3: '3',
        4: '4',
        5: '5',
        6: '6',
        7: '7',
        8: '8',
        9: '9',
        10: '10',

    }
    return <Slider data-testid="nps-slider" min={1} max={10} defaultValue={8} style={{ width: 250}} marks={marks} {...props}/>
}

export default MySlider