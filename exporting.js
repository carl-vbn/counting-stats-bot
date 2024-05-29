const fs = require('fs/promises');
const analyser = require('./countdata/analyser');
const crawler = require('./countdata/crawler');

const spawn = require('child_process').spawn;

module.exports = {
    async exportGraph(guild, channelType) {
        console.log(`[${Date.now()}] Exporting stats of ${channelType} for guild ${guild.name} (${guild.id})`);
        if (global.config[guild.id].hasOwnProperty(channelType)) {
            const channel = await guild.channels.fetch(global.config[guild.id][channelType]);
            const messages = await crawler.crawlAll(channel);
            const stats = analyser.analyze(messages, channel.id, 50, true);

            const datedNumbers = {};
            for (const [messageId, number] of Object.entries(stats.assignedNumbers)) {
                for (const message of messages) {
                    if (message.id == messageId) {
                        datedNumbers[message.createdTimestamp] = number;
                        break;
                    }
                }
            }

            const csv = Object.entries(datedNumbers).map(([date, number]) => `${date},${number}`).join('\n');

            console.log(`Writing data to file...`);
            await fs.writeFile(`data_${channelType}.csv`, csv);

            console.log(`Running grapher...`);
            const grapherProc = spawn('python3', ['grapher.py', channelType]);
            grapherProc.on('close', (code) => {
                console.log(`[${Date.now()}] Grapher exited with code ${code}`);
                if (code != 0) {
                    console.error(`!!! GRAPHING FAILED !!!`);
                }
            });
        } else {
            console.log(`[${Date.now()}] No counting channel set for guild ${guild.name} (${guild.id})`);
        }
    },
};
