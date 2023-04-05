import {Button, styled} from '@nextui-org/react';
import { TwitterIcon } from './icons/twitter-icon';

export const Box = styled('div', {
  boxSizing: 'border-box',
});


export const TweetButton = () => {
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
        // position: 'fixed',
        // top: '10px',
        // left: '10px',
        zIndex: 10,
      }}
      href="https://twitter.com/intent/tweet?text=%F0%9F%93%9D+askpaper.ai+-+Understand+any+paper%21%0D%0ACurrently+in+love+with+this+new+AI+tool.+It+let%27s+you+ask+open+questions%2C+generate+great+summaries+%26+extract+data+from+papers.+%0D%0APerfect+for+researchers+trying+to+ramp+up+their+paper+reading+game%21+"
      icon={<TwitterIcon filled fill="#1DA1F2" size={20}/>}
      rel="noreferrer"
      target="_blank"
      size="sm"

    >
      Share on Twitter
    </Button>
  )
};
