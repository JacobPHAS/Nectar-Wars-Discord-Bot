const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

const commands = [
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('Shows the Nectar Wars server status.'),

    new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Shows the Nectar Wars leaderboard.')
].map(command => command.toJSON());

if (!token) {
    console.error('DISCORD_TOKEN is missing.');
    process.exit(1);
}

if (!clientId) {
    console.error('CLIENT_ID is missing.');
    process.exit(1);
}

if (!guildId) {
    console.error('GUILD_ID is missing.');
    process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

async function deployCommands() {
    try {
        console.log('Registering Discord commands...');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );

        console.log('Discord commands registered successfully!');
    } catch (error) {
        console.error('Failed to register commands:', error);
        process.exit(1);
    }
}

deployCommands();
