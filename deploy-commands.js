const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const { clientId, guildId } = require('./config.json');

const commands = [
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('Shows the Nectar Wars server status.'),

    new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Shows the Nectar Wars leaderboard.')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

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
    }
}

deployCommands();
