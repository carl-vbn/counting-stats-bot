const { SlashCommandBuilder, CommandInteraction, EmbedBuilder } = require('discord.js');
const analyser = require('../countdata/analyser');
const crawler = require('../countdata/crawler');

let latestStats = {};

async function genStats(channel) {
    const messages = await crawler.crawlAll(channel);
    const stats = analyser.analyze(messages, channel.id, 50);
    const miscounts = await analyser.findMiscounts(messages, stats.assignedNumbers);

    const miscountsPerUser = {};
    const miscounterUsernames = {};
    for (const miscount of miscounts) {
        if (!miscountsPerUser[miscount.author.id]) {
            miscountsPerUser[miscount.author.id] = 1;
            miscounterUsernames[miscount.author.id] = miscount.author.username;
        } else {
            miscountsPerUser[miscount.author.id]++;
        }
    }

    const topMiscouters = Object.entries(miscountsPerUser).sort((a, b) => b[1] - a[1]);

    return {
        time: Date.now(),
        miscounts,
        miscountsPerUser,
        miscounterUsernames,
        topMiscouters
    };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('counting-shame')
        .setDescription('Show who messes up the count the most')
	    .addStringOption(option =>
		    option.setName('channel')
			.setDescription('The counting channel to use')
			.setRequired(false)
			.addChoices(
				{ name: 'Original', value: 'original' },
				{ name: 'Reincarnated', value: 'new' },
			)),

    /**
     * 
     * @param {CommandInteraction} interaction 
     */
    async execute(interaction) {
	const channelType = (interaction.options.getString('channel') ?? 'new') == 'new' ? 'countingChannel' : 'originalCountingChannel';
        if (global.config[interaction.guild.id][channelType]) {
            const channel = await interaction.guild.channels.fetch(global.config[interaction.guild.id][channelType]);
            
            let defered = false;
            if (!latestStats[channel.id] || (channelType != 'originalCountingChannel' && Date.now() - latestStats[channel.id].time > 8.64E7)) {
                await interaction.deferReply();
                defered = true;
                latestStats[channel.id] = await genStats(channel);
            }

            const stats = latestStats[channel.id];
            
            const statsEmbed = new EmbedBuilder()
            .setColor(0xFF6600)
            .setTitle('Counting shame')
            .setURL('https://www.wikicu.com/Counting')
            .setDescription(`Top miscounters for <#${channel.id}>\nLast updated <t:${Math.floor(stats.time/1000)}:R>`)
            .addFields(
                { name: 'Number of miscounts', value: `${stats.miscounts.size}` },
                { name: 'Top miscounters', value: stats.topMiscouters.slice(0, 10).map(msc => `- ${stats.miscounterUsernames[msc[0]]}: ${msc[1]}`).join('\n') },
                { name: 'Your personal stats', value: `${stats.miscountsPerUser[interaction.user.id] ?? 0} miscounts` }
            )
            .setTimestamp()
            .setFooter({ text: 'Requested by '+interaction.user.username, iconURL: interaction.user.avatarURL() });

            try {
                if (defered)
                    await interaction.editReply({embeds: [statsEmbed]}); 
                else 
                    await interaction.reply({embeds: [statsEmbed]});
            } catch (err) { console.error(err); }
        } else {
            await interaction.reply({content: `This server doesn't have a counting channel set!`, ephemeral: true});
        }
    },
};