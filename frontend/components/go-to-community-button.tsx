import { Button, styled } from '@nextui-org/react';
import DiscordIcon from './icons/discord-icon';

export const Box = styled('div', {
  boxSizing: 'border-box',
});


export const GoToCommunityButton = () => {
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
              transform: "scale(1.2)",
            },
          },
        }}
        href="https://discord.gg/6rVU4hrc9f"
        icon={<DiscordIcon filled fill="#5865F2" size={20} />}
        rel="noreferrer"
        target="_blank"
        size="sm"

      >
        Go To Community
    </Button>
  )
};
