
import discord
from utils.constants import DISCORD_WHITELIST_ROLENAME, HIPPOAI_DISCORD_SERVER_ID, DISCORD_CLIENT_BOT_TOKEN
from discord.utils import get


class DiscordClient(discord.Client):

    async def on_ready(self):
        print(f'Logged on as {self.user}!')
        self.setup()
        await self.close()


    def setup(self) -> None:
        # await self.wait_until_ready()

        def get_guild(id: int):
            for guild in self.guilds:
                if int(guild.id) == int(id):
                    return guild

        server = get_guild(HIPPOAI_DISCORD_SERVER_ID)

        if not server:
            print(f"Server {HIPPOAI_DISCORD_SERVER_ID} not found.")
            return

        role = discord.utils.get(server.roles, name=DISCORD_WHITELIST_ROLENAME)
        if not role:
            print("Role not found.")
            return

        self.role = role
        self.members = server.members
        if len(self.members) > 0:
            print("Members loaded")

        print("Discord client setup complete.")

    def member_present_with_needed_role(self, discord_id: str) -> bool:
        if discord_id is None: return False
        for member in self.members:
            if int(member.id) == int(discord_id):
                if self.role in member.roles:
                    print(f"Member {member} has role {self.role}")
                    return True
                else:
                    print(f"Member {member} does not have role {self.role}")
                return False
            
        print(f"Member with id {discord_id} not found.")
        return False


intents = discord.Intents.default()
intents.guilds = True
intents.members = True
client = DiscordClient(intents=intents)
client.run(DISCORD_CLIENT_BOT_TOKEN)