import { Flex } from "./styles/flex";
import { Avatar, Text } from "@nextui-org/react";
import { TweetButton } from "./sponsor-button";

interface ProfileInfoProps {
  name?: string | null;
  imageURL?: string | null;
}
const ProfileInfo = ({ name, imageURL }: ProfileInfoProps) => {
  return (
    <Flex css={{
      gap: '$4',
      position: 'fixed',
      top: '10px',
      left: '10px',
    }}>
      <Avatar
        size="lg"
        src={imageURL ?? undefined}
        color="warning"
        bordered
      />
      <Text data-testid="discord-username">{name ?? 'Oops..'}</Text>
      <TweetButton />
    </Flex>
  );
}
export default ProfileInfo;