const {Client, Events, GatewayIntentBits} = require('discord.js');
export default async function handler(request, response) {
    const client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]});

    await client.login(process.env.DISCORD_CLIENT_BOT_TOKEN);
    const isWhitelisted = new Promise((resolve, reject) => {
        client.once(Events.ClientReady, async () => {
            console.log("Client Ready!");
            const guild = client.guilds.cache.get(process.env.NEXT_PUBLIC_HIPPOAI_DISCORD_SERVER_ID);
            const members = await guild.members.fetch()
            const memberExists = members.find(member => {
                return member.roles.cache.find(role => member.id === request.query.userId)
            })
            const hasRole = members.find(member => {
                return member.roles.cache.find(role => role.name === request.query.role && member.id === request.query.userId)
            })
            resolve({inDiscord: memberExists !== undefined, hasRole: hasRole !== undefined});
        });
        setInterval(() => {
            reject();
        }, 30000)
    })

    isWhitelisted.then(value => {
        response.status(200).json(value);
    }).catch(() => {
        response.status(504).json({message: 'Timeout'})
    })

}
