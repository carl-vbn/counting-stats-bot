const { SlashCommandBuilder, CommandInteraction, EmbedBuilder } = require('discord.js');
const crawler = require('../countdata/crawler');
const analyser = require('../countdata/analyser');
const grapher = require('../countdata/grapher');

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

            // Command sender stats
            const personalMessagesSent = messages.filter(msg => msg.author.id == interaction.user.id).length;
            let personalRank = undefined;

            for (let i = 0; i<stats.mostActiveCounters.length; i++) {
                if (stats.mostActiveCounters[i][0] == interaction.user.id) {
                    personalRank = i+1;
                    break;
                }
            }

            let personalHighestNumber = 0;
            for (const [messageId, number] of Object.entries(stats.assignedNumbers)) {
                if (number <= personalHighestNumber) continue;

                for (const message of messages) {
                    if (message.id == messageId && message.author.id == interaction.user.id) {
                        personalHighestNumber = number;
                    }
                }
            }


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
                { name: 'Most active counters', value: stats.mostActiveCounters.slice(0, 10).map(mac => `- ${mac[1].username} (${mac[1].messagesSent} messages)`).join('\n') },
                { name: 'Your personal stats', value: `- Messages sent: ${personalMessagesSent}${personalMessagesSent > 0 ? '\n- Rank: #'+personalRank : ''}\n-Highest number: ${personalHighestNumber}`}
            )
            .setTimestamp()
            .setFooter({ text: 'Requested by '+interaction.user.username, iconURL: interaction.user.avatarURL() });
            
            grapher.createChart(null);

            try {await interaction.reply({embeds: [statsEmbed], ephemeral: interaction.user.username == 'NamePointer'}); } catch (err) { console.error(err); }
        } else {
            await interaction.reply({content: `This server doesn't have a counting channel set!`, ephemeral: true});
        }
    },
};