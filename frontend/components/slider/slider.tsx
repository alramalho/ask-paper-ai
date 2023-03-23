import React from 'react';
import { DashboardOutlined, AlignLeftOutlined } from '@ant-design/icons';
import { Slider } from 'antd';
import { Flex } from '../styles/flex';
import {Text} from "@nextui-org/react";

interface IconSliderProps {
  onChange: (value: number) => void;
  value: number;
  max: number;
  min: number;
}

const IconSlider: React.FC<IconSliderProps> = (props) => {
  const { max, min } = props;

  const mid = Number(((max - min) / 2).toFixed(5));

  function setMax() {
    props.onChange(max);
  }
  function setMin() {
    props.onChange(min);
  }

  return (
    <>
    <Flex className="icon-wrapper" css={{width: '100%', gap: "$4"}}>
      <AlignLeftOutlined onClick={setMin}/>
      <Slider tooltip={{ formatter: null }} {...props} style={{flexGrow: 1}}/>
      <DashboardOutlined onClick={setMax}/>
    </Flex>
    <Flex css={{justifyContent: 'space-between', width: '100%'}}>
      <Text small css={{cursor: 'pointer'}} onClick={setMin}>Best results</Text>
      <Text small css={{cursor: 'pointer'}} onClick={setMax}>Best speed</Text>
    </Flex>
    </>
  );
};

export default IconSlider;