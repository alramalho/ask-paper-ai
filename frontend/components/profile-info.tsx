import {Flex} from "./styles/flex";
import {Avatar, Text} from "@nextui-org/react";

interface ProfileInfoProps {
  name?: string | null;
  imageURL?: string | null;
}
const ProfileInfo = ({name, imageURL}: ProfileInfoProps) => {
  return (
    <Flex css={{
      gap: '$4',
      position: 'fixed',
      top: '10px',
      right: '10px',
    }}>
      <Text data-testid="discord-username">{name ?? 'Oops..'}</Text>
      <Avatar
        size="lg"
        src={imageURL ?? undefined}
        color="warning"
        bordered
      />
    </Flex>
  );
}
export default ProfileInfo;