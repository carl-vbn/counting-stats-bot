const { SlashCommandBuilder, CommandInteraction, EmbedBuilder } = require('discord.js');
const analyser = require('../countdata/analyser');

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
            const messages = await crawler.crawlAll(channel);
            const stats = analyser.analyze(messages, channel.id, 50);

            const statsEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Counting stats')
            .setURL('https://www.wikicu.com/Counting')
            .setDescription('Latest counting statistics')
            .setThumbnail('https://cdn.discordapp.com/icons/869050227397656586/574ebb413d3da02b1cae268e4e54fa71.webp')
            .addFields(
                { name: 'Number of messages', value: `${messages.length}` },
                { name: 'Highest number', value: `${stats.highestNumber}` },
                { name: 'Number of attempts', value: `${stats.chainCount}` },
                { name: 'Most active counters', value: stats.mostActiveCounters.slice(0, 10).map(mac => `- ${mac[0]} (${mac[1]} messages)`).join('\n') }
            )
            .setTimestamp()
            .setFooter({ text: 'Requested by '+interaction.user.username, iconURL: interaction.user.avatarURL() });

            try {await interaction.reply({embeds: [statsEmbed]}); } catch (err) { console.error(err); }
        } else {
            await interaction.reply({content: `This server doesn't have a counting channel set!`, ephemeral: true});
        }
    },
};