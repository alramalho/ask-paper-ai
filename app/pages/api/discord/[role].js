const { Client, Events, GatewayIntentBits, GuildMember } = require('discord.js');
export default async function handler(request, response) {
    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
    client.login(process.env.TOKEN);

    client.once(Events.ClientReady, async () => {
        console.log('Client Ready!');
        const guild = client.guilds.cache.get(process.env.GUILD_ID);
        const members = await guild.members.fetch()
        const membersWithRole = members.filter(member => {
            return member.roles.cache.find(role => role.name == request.query.role)
        })
        const membersParsed = membersWithRole.map(e => ({name: e.displayName, avatarUrl: e.displayAvatarURL()}))
        response.end(JSON.stringify(membersParsed));
    });

}
