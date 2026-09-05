const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { Rcon } = require('rcon-client');
const {
    token,
    rconHost,
    rconPort,
    rconPassword
} = require('./config.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

client.once('ready', () => {
    console.log(`Nectar Wars bot online as ${client.user.tag}`);
    console.log(`RCON: ${rconHost}:${rconPort}`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'status') {
        await interaction.deferReply();

        let rcon;

        try {
            rcon = await Rcon.connect({
                host: rconHost,
                port: rconPort,
                password: rconPassword
            });

            const response = await rcon.send('discordstatus');
            const parts = response.split('|');

            if (parts[0] !== 'NWSTATUS') {
                await interaction.editReply('Minecraft returned an invalid status.');
                return;
            }

            const status = parts[1];
            const game = parts[2];
            const players = parts[3];

            const embed = new EmbedBuilder()
                .setColor(0xF2B705)
                .setTitle('Nectar Wars')
                .setDescription('Current server status')
                .addFields(
                    {
                        name: 'Status',
                        value: `\`${status}\``,
                        inline: true
                    },
                    {
                        name: 'Game',
                        value: `\`${game}\``,
                        inline: true
                    },
                    {
                        name: 'Players',
                        value: `\`${players}\``,
                        inline: true
                    }
                )
                .setFooter({
                    text: 'Nectar Wars'
                })
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (error) {
            console.error('Minecraft connection failed:', error);

            await interaction.editReply(
                'Unable to retrieve the Minecraft server status.'
            );

        } finally {
            if (rcon) {
                try {
                    await rcon.end();
                } catch (error) {
                    console.error('Failed to close RCON:', error);
                }
            }
        }
    }
});

client.on('error', error => {
    console.error('Discord client error:', error);
});

client.login(token).catch(error => {
    console.error('Login failed:', error);
});