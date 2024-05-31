require('dotenv').config();

const fs = require('fs/promises');
const path = require('path');
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const commands = require('./commands');
const { exportCharts } = require('./exporting');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages] });

global.config = {};

async function exists(fileOrDir) {
    return await (fs.access(fileOrDir).then(() => true).catch(() => false));
}

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity('you mess up the count', {type:ActivityType.Watching});
    
    await client.guilds.fetch();
    console.log(`Bot is in ${client.guilds.cache.size} guild(s).`);

    const configDir = path.join(process.cwd(), 'config');
    const cacheDir = path.join(process.cwd(), 'cache');

    // Create config and cache directories if they don't exist
    if (!(await exists(configDir))) await fs.mkdir(configDir);
    if (!(await exists(cacheDir))) await fs.mkdir(cacheDir);

    let graphedGuildIDs = [];
    if (exists(path.join(configDir, 'graphed_guilds.json'))) {
        graphedGuildIDs = JSON.parse(await fs.readFile(path.join(configDir, 'graphed_guilds.json')));
    }

    // Create or load config files
    for (const [guildId, guild] of client.guilds.cache) {
        const configFile = path.join(configDir, guildId+'.json');
        if (await (fs.access(configFile).then(() => true).catch(() => false))) {
            console.log(`Loading config file for guild '${guild.name}'...`);
            global.config[guildId] = JSON.parse(await fs.readFile(configFile));
        } else {
            console.log(`Creating config file for guild '${guild.name}'...`);
            await fs.writeFile(configFile, JSON.stringify({}));
            global.config[guildId] = {};
        }
        
        if (graphedGuildIDs.includes(guildId)) {
            exportCharts(guild, 'countingChannel');
	    exportCharts(guild, 'originalCountingChannel');
            console.log(`Starting graphing interval for guild '${guild.name}'.`);
            setInterval(() => {
                exportCharts(guild, 'countingChannel');
		exportCharts(guild, 'originalCountingChannel');
            }, 1000*60*60*24);
        }
    }
    
    commands.register(client);
});

// Event called when the bot is added to a server while it is running
client.on('guildCreate', () => {
    console.error("Error: Added to guild while running. Code was not designed for that. Shutting down...");
    process.exit(-1);
});

console.log("Logging in...");
client.login(process.env.BOT_TOKEN);
