const fs = require('fs/promises');
const analyser = require('./countdata/analyser');
const crawler = require('./countdata/crawler');

const spawn = require('child_process').spawn;

module.exports = {
    async exportCharts(guild, channelType) {
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

            let proportions = stats.mostActiveCounters.map(([_, data]) => [data.username, data.messagesSent / messages.length]).sort((a, b) => b[1] - a[1]);
            
            if (proportions.length > 5) {
                proportions = proportions.slice(0, 5);
            }
            
            const proportionSum = proportions.reduce((acc, [_, proportion]) => acc + proportion, 0);
            if (proportionSum < 1) {
                proportions.push(['Others', 1 - proportionSum]);
            }
            
            const curve_csv = Object.entries(datedNumbers).map(([date, number]) => `${date},${number}`).join('\n');
            const pie_csv = proportions.map(entry => `${entry[0]},${entry[1]}`).join('\n');

            console.log(`Writing data to file...`);
            
            if (!(await fs.access('exports').then(() => true).catch(() => false))) await fs.mkdir('exports');
            curve_data_file = `exports/curve_${channelType}.csv`;
            curve_output_file = `exports/curve_${channelType}.png`;
            pie_data_file = `exports/pie_${channelType}.csv`;
            pie_output_file = `exports/pie_${channelType}.png`;
            await fs.writeFile(curve_data_file, curve_csv);
            await fs.writeFile(pie_data_file, pie_csv);

            console.log(`Running 'grapher.py ${curve_data_file} ${curve_output_file}'...`);
            const grapherProc = spawn('python', ['grapher.py', curve_data_file, curve_output_file ]);
            grapherProc.on('close', (code) => {
                console.log(`[${Date.now()}] Grapher exited with code ${code}`);
                if (code != 0) {
                    console.error(`!!! GRAPHING FAILED !!!`);
                }
            });

            console.log(`Running 'piechart.py ${pie_data_file} ${pie_output_file}'...`);
            const piechartProc = spawn('python', ['piechart.py', pie_data_file, pie_output_file ]);
            piechartProc.on('close', (code) => {
                console.log(`[${Date.now()}] Piechart exited with code ${code}`);
                if (code != 0) {
                    console.error(`!!! PIECHART FAILED !!!`);
                }
            });
        } else {
            console.log(`[${Date.now()}] No counting channel set for guild ${guild.name} (${guild.id})`);
        }
    },
};
