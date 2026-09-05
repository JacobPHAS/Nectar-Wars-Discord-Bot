const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { Rcon } = require('rcon-client');

const token = process.env.DISCORD_TOKEN;
const rconHost = process.env.RCON_HOST;
const rconPort = Number(process.env.RCON_PORT);
const rconPassword = process.env.RCON_PASSWORD;

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

            console.log('Connected to Minecraft RCON');

            const response = await rcon.send('discordstatus');

            console.log(`Minecraft replied: ${response}`);

            const parts = response.split('|');

            if (parts[0] !== 'NWSTATUS') {
                await interaction.editReply(
                    'Minecraft returned an invalid status.'
                );
                return;
            }

            const status = parts[1] || 'Unknown';
            const game = parts[2] || 'Unknown';
            const players = parts[3] || '0';

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

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(
                    'Unable to retrieve the Minecraft server status.'
                );
            } else {
                await interaction.reply(
                    'Unable to retrieve the Minecraft server status.'
                );
            }

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

if (!token) {
    console.error('DISCORD_TOKEN is missing.');
    process.exit(1);
}

if (!rconHost) {
    console.error('RCON_HOST is missing.');
    process.exit(1);
}

if (!rconPort) {
    console.error('RCON_PORT is missing or invalid.');
    process.exit(1);
}

if (!rconPassword) {
    console.error('RCON_PASSWORD is missing.');
    process.exit(1);
}

client.login(token).catch(error => {
    console.error('Login failed:', error);
});