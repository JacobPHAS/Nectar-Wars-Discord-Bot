const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const { token, clientId, guildId } = require('./config.json');

const commands = [
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('Shows the Nectar Wars status!')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

async function deployCommands() {
    try {
        console.log('🔄 Registering commands...');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );

        console.log('✅ Commands registered successfully!');
    } catch (error) {
        console.error('❌ Command registration failed:');
        console.error(error);
    }
}

deployCommands();