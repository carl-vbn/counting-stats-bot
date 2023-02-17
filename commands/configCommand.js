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
        await interaction.reply(`Command not implemented yet`);
    },
};