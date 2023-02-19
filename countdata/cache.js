const { Message } = require('discord.js');
const fs = require('fs/promises');
const path = require('path');

let cachingPromise = null;

async function loadCache(channelId) {
    if (cachingPromise) await cachingPromise;

    const cacheFile = path.join(process.cwd(), 'cache', channelId+'.json');
    const cacheExists = await fs.access(cacheFile, fs.constants.F_OK).then(() => true).catch(() => false);

    if (cacheExists) {
        return JSON.parse(await fs.readFile(cacheFile));
    } else {
        return [];
    }
}

/**
 * @param {string} channelId 
 * @param {Message[]} messages 
 */
async function cacheMessages(channelId, messages) {
    if (cachingPromise) await cachingPromise;

    const cacheFile = path.join(process.cwd(), 'cache', channelId+'.json');
    cachingPromise = fs.writeFile(cacheFile, JSON.stringify(messages.map(msg => (
        {
            id: msg.id,
            member: {
                id: msg.member.id,
                user: { username: msg.member.user.username }
            },
            content: msg.content,
            attachments: msg.attachments.map(a => ({
                id: a.id,
                url: a.url
            }))
        }
    ) )));

    await cachingPromise;
    cachingPromise = null;
}

exports.loadCache = loadCache;
exports.cacheMessages = cacheMessages;