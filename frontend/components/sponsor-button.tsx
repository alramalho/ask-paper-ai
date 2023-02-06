import {Button, CSS, Image, styled} from '@nextui-org/react';
import {HeartIcon} from "./icons/heart-icon";
import {keyframes} from "@nextui-org/react";
import {StitchesConfig} from "@nextui-org/react/types/theme/stitches.config";

export const Box = styled('div', {
  boxSizing: 'border-box',
});

const pulse = keyframes({
  // @ts-ignore
  "0%": {
    transform: "scale(1)",
  },
  // @ts-ignore
  "50%": {
    transform: "scale(1.2)",
  },
  // @ts-ignore
  "100%": {
    transform: "scale(1)",
  },
});

export const SponsorButton = () => {
  return (

    <Button
      auto
      as="a"
      css={{
        bg: "$gray50",
        color: "$text",
        maxH: "38px",
        px: "$8",
        "& .nextui-button-icon": {
          mr: "$2",
        },
        "& .nextui-button-icon svg": {
          transition: "$default",
        },
        "&:hover": {
          "& .nextui-button-icon svg": {
            animation: `${pulse} 1s infinite`,
          },
        },
        position: 'fixed',
        top: '10px',
        left: '10px',
        zIndex: 10,
      }}
      href="https://www.hippoai.org"
      icon={<HeartIcon filled fill="red" size={20} />}
      rel="noreferrer"
      target="_blank"
      size="xl"

    >
      Support the foundation
    </Button>
  )
};
