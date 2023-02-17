const { SlashCommandBuilder, CommandInteraction } = require('discord.js');

const crawler = require('../countdata/crawler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('counting-stats')
        .setDescription('Show counting stats'),

    /**
     * 
     * @param {CommandInteraction} interaction 
     */
    async execute(interaction) {
        if (global.config[interaction.guild.id].hasOwnProperty('countingChannel')) {
            const channel = await interaction.guild.channels.fetch(global.config[interaction.guild.id].countingChannel);
            const count = await crawler.crawlAll(channel);

            await interaction.reply({content: `Found ${count.length} messages. ${count.filter(e => e == null).length} of them are null.`, ephemeral: false});
        } else {
            await interaction.reply({content: `This server doesn't have a counting channel set!`, ephemeral: true});
        }
    },
};