const fs = require('fs/promises');
const { SlashCommandBuilder, CommandInteraction, EmbedBuilder } = require('discord.js');
const analyser = require('../countdata/analyser');
const crawler = require('../countdata/crawler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('export')
        .setDescription('Show counting stats'),

    /**
     * 
     * @param {CommandInteraction} interaction 
     */
    async execute(interaction) {
        if (global.config[interaction.guild.id].hasOwnProperty('countingChannel')) {
            const channel = await interaction.guild.channels.fetch(global.config[interaction.guild.id].countingChannel);
            const messages = await crawler.crawlAll(channel);
            const stats = analyser.analyze(messages, channel.id, 50);

            const datedNumbers = {};
            for (const [messageId, number] of Object.entries(stats.assignedNumbers)) {
                for (const message of messages) {
                    if (message.id == messageId) {
                        datedNumbers[message.createdTimestamp] = number;
                        break;
                    }
                }
            }

            await fs.writeFile(channel.id+'.export.json', JSON.stringify(datedNumbers));

            await interaction.reply({content: `Export complete.`, ephemeral: true});
        } else {
            await interaction.reply({content: `This server doesn't have a counting channel set!`, ephemeral: true});
        }
    },
};