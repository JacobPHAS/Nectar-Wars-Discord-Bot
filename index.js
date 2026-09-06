const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

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

async function getMinecraftResponse(command) {
    let rcon;

    try {
        rcon = await Rcon.connect({
            host: rconHost,
            port: rconPort,
            password: rconPassword
        });

        return await rcon.send(command);
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

function createStatusEmbed(status, game, players) {
    return new EmbedBuilder()
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
}

function createLeaderboardEmbed(type, data, page, totalPages) {
    const start = page * 10;
    const pageData = data.slice(start, start + 10);

    let description = '';

    if (pageData.length === 0) {
        description = 'No leaderboard data available.';
    } else {
        for (const entry of pageData) {
            let rankText;

            if (entry.rank === 1) {
                rankText = '**1.**';
            } else if (entry.rank === 2) {
                rankText = '**2.**';
            } else if (entry.rank === 3) {
                rankText = '**3.**';
            } else {
                rankText = `**${entry.rank}.**`;
            }

            description += `${rankText} ${entry.name} — \`${entry.score} pts\`\n`;
        }
    }

    const title =
        type === 'players'
            ? 'Nectar Wars — Player Leaderboard'
            : 'Nectar Wars — Team Leaderboard';

    return new EmbedBuilder()
        .setColor(0xF2B705)
        .setTitle(title)
        .setDescription(description)
        .setFooter({
            text: `Page ${page + 1} of ${totalPages} • Nectar Wars`
        })
        .setTimestamp();
}

function createLeaderboardButtons(type, page, totalPages) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('leaderboard_players')
            .setLabel('Players')
            .setStyle(
                type === 'players'
                    ? ButtonStyle.Primary
                    : ButtonStyle.Secondary
            ),

        new ButtonBuilder()
            .setCustomId('leaderboard_teams')
            .setLabel('Teams')
            .setStyle(
                type === 'teams'
                    ? ButtonStyle.Primary
                    : ButtonStyle.Secondary
            ),

        new ButtonBuilder()
            .setCustomId('leaderboard_previous')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 0),

        new ButtonBuilder()
            .setCustomId('leaderboard_next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1)
    );
}

function parseLeaderboardResponse(response) {
    const lines = response
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);

    const players = [];
    const teams = [];

    for (const line of lines) {
        const parts = line.split('|');

        if (parts[0] === 'PLAYER' && parts.length >= 4) {
            players.push({
                rank: Number(parts[1]),
                name: parts[2],
                score: Number(parts[3])
            });
        }

        if (parts[0] === 'TEAM' && parts.length >= 4) {
            teams.push({
                rank: Number(parts[1]),
                name: parts[2],
                score: Number(parts[3])
            });
        }
    }

    return { players, teams };
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() && !interaction.isButton()) {
        return;
    }

    // =========================
    // /status
    // =========================

    if (interaction.isChatInputCommand() && interaction.commandName === 'status') {
        await interaction.deferReply();

        try {
            const response = await getMinecraftResponse('discordstatus');
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

            await interaction.editReply({
                embeds: [
                    createStatusEmbed(status, game, players)
                ]
            });

        } catch (error) {
            console.error('Minecraft connection failed:', error);

            await interaction.editReply(
                'Unable to retrieve the Minecraft server status.'
            );
        }

        return;
    }

    // =========================
    // /leaderboard
    // =========================

    if (
        interaction.isChatInputCommand() &&
        interaction.commandName === 'leaderboard'
    ) {
        await interaction.deferReply();

        try {
            const response = await getMinecraftResponse(
                'discordleaderboard'
            );

            const leaderboard = parseLeaderboardResponse(response);

            if (
                leaderboard.players.length === 0 &&
                leaderboard.teams.length === 0
            ) {
                await interaction.editReply(
                    'No leaderboard data was returned by Minecraft.'
                );
                return;
            }

            const type = 'players';
            const data = leaderboard.players;

            const totalPages = Math.max(
                1,
                Math.ceil(data.length / 10)
            );

            await interaction.editReply({
                embeds: [
                    createLeaderboardEmbed(
                        type,
                        data,
                        0,
                        totalPages
                    )
                ],
                components: [
                    createLeaderboardButtons(
                        type,
                        0,
                        totalPages
                    )
                ]
            });

            const message = await interaction.fetchReply();

            const collector = message.createMessageComponentCollector({
                time: 5 * 60 * 1000
            });

            let currentType = 'players';
            let currentPage = 0;

            collector.on('collect', async buttonInteraction => {
                try {
                    await buttonInteraction.deferUpdate();

                    if (buttonInteraction.customId === 'leaderboard_players') {
                        currentType = 'players';
                        currentPage = 0;
                    }

                    if (buttonInteraction.customId === 'leaderboard_teams') {
                        currentType = 'teams';
                        currentPage = 0;
                    }

                    const currentData =
                        currentType === 'players'
                            ? leaderboard.players
                            : leaderboard.teams;

                    const currentTotalPages = Math.max(
                        1,
                        Math.ceil(currentData.length / 10)
                    );

                    if (
                        buttonInteraction.customId === 'leaderboard_previous' &&
                        currentPage > 0
                    ) {
                        currentPage--;
                    }

                    if (
                        buttonInteraction.customId === 'leaderboard_next' &&
                        currentPage < currentTotalPages - 1
                    ) {
                        currentPage++;
                    }

                    await interaction.editReply({
                        embeds: [
                            createLeaderboardEmbed(
                                currentType,
                                currentData,
                                currentPage,
                                currentTotalPages
                            )
                        ],
                        components: [
                            createLeaderboardButtons(
                                currentType,
                                currentPage,
                                currentTotalPages
                            )
                        ]
                    });

                } catch (error) {
                    console.error(
                        'Leaderboard button error:',
                        error
                    );
                }
            });

            collector.on('end', async () => {
                try {
                    const currentData =
                        currentType === 'players'
                            ? leaderboard.players
                            : leaderboard.teams;

                    const currentTotalPages = Math.max(
                        1,
                        Math.ceil(currentData.length / 10)
                    );

                    await interaction.editReply({
                        embeds: [
                            createLeaderboardEmbed(
                                currentType,
                                currentData,
                                currentPage,
                                currentTotalPages
                            )
                        ],
                        components: []
                    });
                } catch (error) {
                    console.error(
                        'Failed to disable leaderboard buttons:',
                        error
                    );
                }
            });

        } catch (error) {
            console.error(
                'Minecraft leaderboard connection failed:',
                error
            );

            await interaction.editReply(
                'Unable to retrieve the leaderboard from Minecraft.'
            );
        }

        return;
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
