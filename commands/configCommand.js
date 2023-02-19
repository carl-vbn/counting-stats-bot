const fs = require('fs/promises');
const path = require('path');
const { SlashCommandBuilder, CommandInteraction, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('counting-bot-config')
        .setDescription('Counting bot configuration command.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-counting-channel')
                .setDescription('Change the counting channel')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The counting channel')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        ),
    
    /**
     * 
     * @param {CommandInteraction} interaction 
     */
    async execute(interaction) {
        if (interaction.member.id == process.env.ADMIN) {
            if (interaction.options.getSubcommand() == 'set-counting-channel') {
                const configData = global.config[interaction.guild.id];
                configData['countingChannel'] = interaction.options.get('channel').channel.id;
                try {
                    const configFile = path.join(process.cwd(), 'config', interaction.guild.id+'.json');
                    await fs.writeFile(configFile, JSON.stringify(configData));
                    await interaction.reply({content: `Channel updated.`, ephemeral: true});
                } catch (err) {
                    console.error(err);
                    await interaction.reply({content: `Failed to save guild config file.`, ephemeral: true});
                }
            }
        } else {
            await interaction.reply({content: `You need to be a server administrator to run that command!`, ephemeral: true});
        }
    },
};