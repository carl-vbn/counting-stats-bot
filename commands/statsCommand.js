const { SlashCommandBuilder, CommandInteraction, EmbedBuilder } = require('discord.js');
const analyser = require('../countdata/analyser');
const crawler = require('../countdata/crawler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('counting-stats')
        .setDescription('Show counting stats')
	    .addStringOption(option =>
		    option.setName('channel')
			.setDescription('The counting channel to use')
			.setRequired(false)
			.addChoices(
				{ name: 'Original', value: 'original' },
				{ name: 'Reincarnated', value: 'new' },
			))
        .addStringOption(option =>
            option.setName('chart')
            .setDescription('The type of chart to display')
            .setRequired(false)
            .addChoices(
                { name: 'Count over time', value: 'curve' },
                { name: 'Top counters', value: 'pie' },
                { name: 'None', value: 'none' }
            )),

    /**
     * 
     * @param {CommandInteraction} interaction 
     */
    async execute(interaction) {
	const channelType = (interaction.options.getString('channel') ?? 'new') == 'new' ? 'countingChannel' : 'originalCountingChannel';
        if (global.config[interaction.guild.id][channelType]) {
            const channel = await interaction.guild.channels.fetch(global.config[interaction.guild.id][channelType]);
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
            
            let attachmentName = null;
            if (!interaction.options.getString('chart')) {
                attachmentName = Math.random() > 0.5 ? `curve_${channelType}.png` : `pie_${channelType}.png`;
            } else if (interaction.options.getString('chart') == 'curve') {
                attachmentName = `curve_${channelType}.png`;
            } else if (interaction.options.getString('chart') == 'pie') {
                attachmentName = `pie_${channelType}.png`;
            }

            const statsEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Counting stats')
            .setURL('https://www.wikicu.com/Counting')
            .setDescription(`Latest counting statistics for <#${channel.id}>`)
            .addFields(
                { name: 'Number of messages', value: `${messages.length}` },
                { name: 'Highest number', value: `${stats.highestNumber}` },
                { name: '1000 reached', value: stats.onethousandMessage ? `<t:${Math.floor(stats.onethousandMessage.createdTimestamp / 1000)}>` : `Not yet` },
                { name: 'Number of attempts', value: `${stats.chainCount}` },
                { name: 'Most active counters', value: stats.mostActiveCounters.slice(0, 10).map(mac => `- ${mac[1].username} (${mac[1].messagesSent} messages)`).join('\n') },
                { name: 'Your personal stats', value: `- Messages sent: ${personalMessagesSent}${personalMessagesSent > 0 ? '\n- Rank: #'+personalRank : ''}\n- Highest number: ${personalHighestNumber}`}
            )
            .setTimestamp()
            .setFooter({ text: 'Requested by '+interaction.user.username, iconURL: interaction.user.avatarURL() });

            if (attachmentName) {
                statsEmbed.setImage(`attachment://${attachmentName}`);
            }

            try {
                await interaction.reply({
                    embeds: [statsEmbed],
                    files: attachmentName != null ? [`exports/${attachmentName}`] : []
                }); 
            } catch (err) { console.error(err); }
        } else {
            await interaction.reply({content: `This server doesn't have a counting channel set!`, ephemeral: true});
        }
    },
};
