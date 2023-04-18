import { Flex } from "./styles/flex";
import { Avatar, Text } from "@nextui-org/react";
import { TweetButton } from "./tweet-button";
import { GoToCommunityButton } from "./go-to-community-button";
import { MyDashboardButton } from "./my-dashboard-button";


interface ProfileInfoProps {
  name?: string | null;
  imageURL?: string | null;
}
const Navbar = ({ name, imageURL }: ProfileInfoProps) => {
  return (
    <Flex as="nav" css={{
      wrap: 'nowrap',
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      borderBottom: '1px solid $gray400',
      bg: "$backgroundLighter",
      padding: "$3",
      zIndex: 10,
      justifyContent: 'space-between',
    }}>
      <Flex css={{ gap: "$4" }}>
        <Avatar
          size="lg"
          src={imageURL ?? undefined}
          color="warning"
          bordered
        />
        <Text data-testid="discord-username">{name ?? 'Oops..'}</Text>
        <MyDashboardButton />

      </Flex>
      <Flex css={{ gap: '$4', }}>
        <TweetButton />
        <GoToCommunityButton />
      </Flex>
    </Flex>
  );
}
export default Navbar;