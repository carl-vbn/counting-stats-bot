require('dotenv').config();

const fs = require('fs/promises');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const commands = require('./commands');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages] });

global.config = {};

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    
    await client.guilds.fetch();
    console.log(`Bot is in ${client.guilds.cache.size} guild(s).`);

    const configDir = path.join(process.cwd(), 'config');
    const cacheDir = path.join(process.cwd(), 'cache');

    // Create config and cache directories if they don't exist
    if (!(await (fs.access(configDir).then(() => true).catch(() => false)))) await fs.mkdir(configDir);
    if (!(await (fs.access(cacheDir).then(() => true).catch(() => false)))) await fs.mkdir(cacheDir);
    
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