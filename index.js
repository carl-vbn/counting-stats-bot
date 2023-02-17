require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const commands = require('./commands');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages] });

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  await client.guilds.fetch();
  console.log(`Bot is in ${client.guilds.cache.size} guild(s).`);

  commands.register(client);
});

console.log("Logging in...");
client.login(process.env.BOT_TOKEN);