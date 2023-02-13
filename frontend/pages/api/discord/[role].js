const { Client, Events, GatewayIntentBits, GuildMember } = require('discord.js');
export default async function handler(request, response) {
    const client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]});
    client.login(process.env.DISCORD_CLIENT_BOT_TOKEN);

    client.once(Events.ClientReady, async () => {
        console.log("Client Ready!");
        const guild = client.guilds.cache.get(process.env.DISCORD_SERVER_ID);
        const members = await guild.members.fetch()
        const hasRole = members.find(member => {
            return member.roles.cache.find(role => role.name === request.query.role && member.id === request.query.userId)
        })
        response.status(200).json({hasRole: hasRole !== undefined});
    });

    setInterval(() => {
        response.status(500).json({message: 'Timeout'})
    }, 35000)

}
