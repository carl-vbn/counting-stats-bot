const path = require('path');
const { Client, Collection, Events, Routes, REST } = require('discord.js');

/**
 * @param {Client} client 
 */
exports.register = async function (client) {
    client.commands = new Collection();

    const refreshSlashCommands = async function () {
        const commands = [];
        for (const command of client.commands) {
            commands.push(command[1].data);
        }

        console.log(`Started refreshing ${commands.length} application commands.`);

        const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

        for (const [guildId, guild] of client.guilds.cache) {
            // The put method is used to fully refresh all commands in the guild with the current set
            const data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
                { body: commands },
            );

            console.log(`Successfully reloaded ${data.length} application commands for guild '${guild.name}'`);
        }

    }

    const registerCommand = function (fileName) {
        const command = require(path.join(__dirname, fileName));
        // Set a new item in the Collection with the key as the command name and the value as the exported module
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command defined by ${filePath} is missing a required "data" or "execute" property.`);
        }
    }

    client.on(Events.InteractionCreate, async interaction => {
        if (!interaction.isChatInputCommand()) return;
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`Command handler for '${interaction.commandName}' not found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            try { await interaction.reply({ content: 'An internal error occured while executing this command.', ephemeral: true }); } catch (err) { console.error(err);  }
        }
    });

    registerCommand('configCommand.js');
    registerCommand('statsCommand.js');

    refreshSlashCommands();
}
