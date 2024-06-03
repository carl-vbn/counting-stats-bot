const { Message } = require('discord.js');
const fs = require('fs/promises');
const path = require('path');

let cachingPromise = null;

async function loadCachedMessage(channelId) {
    if (cachingPromise) await cachingPromise;

    const cacheFile = path.join(process.cwd(), 'cache', channelId, 'messages.json');
    const cacheExists = await fs.access(cacheFile, fs.constants.F_OK).then(() => true).catch(() => false);

    if (cacheExists) {
        return JSON.parse(await fs.readFile(cacheFile));
    } else {
        return [];
    }
}

function prepareAttachmentsForCaching(attachments) {
    const attachmentList = [];
    for (const attachment of attachments) {
        attachmentList.push([attachment[0], {url: attachment[1].url}])
    }

    return attachmentList;
}

/**
 * @param {string} channelId 
 * @param {Message[]} messages 
 */
async function cacheMessages(channelId, messages) {
    if (cachingPromise) await cachingPromise;

    // Create the channelId directory if it doesn't exist
    const channelCacheDir = path.join(process.cwd(), 'cache', channelId);
    if (!(await fs.access(channelCacheDir).then(() => true).catch(() => false))) {
        await fs.mkdir(channelCacheDir);
    }

    const cacheFile = path.join(channelCacheDir, 'messages.json');
    fs.writeFile(path.join(channelCacheDir, 'messages.recovery.json'), JSON.stringify(messages));
    cachingPromise = fs.writeFile(cacheFile, JSON.stringify(messages.map(msg => (
        {
            id: msg.id,
            createdTimestamp: msg.createdTimestamp,
            author: {
                id: msg.author?.id,
                username: msg.author?.username
            },
            content: msg.content,
            attachments: prepareAttachmentsForCaching(msg.attachments)
        }
    ) )));

    await cachingPromise;
    cachingPromise = null;
}

async function cacheLlmMiscountResponse(channelId, messages, response) {
    if (cachingPromise) await cachingPromise;

    const key = `${messages[0].id}-${messages[messages.length-1].id}`;

    // Create the channelId directory if it doesn't exist
    const channelCacheDir = path.join(process.cwd(), 'cache', channelId);
    if (!(await fs.access(channelCacheDir).then(() => true).catch(() => false))) {
        await fs.mkdir(channelCacheDir);
    }

    const cacheFile = path.join(channelCacheDir, `llm-miscount-responses.json`);
    
    // Load existing cache if it exists
    let cache = {};
    const cacheExists = await fs.access(cacheFile, fs.constants.F_OK).then(() => true).catch(() => false);
    if (cacheExists) {
        cache = JSON.parse(await fs.readFile(cacheFile));
    }

    cache[key] = response;
    cachingPromise = fs.writeFile(cacheFile, JSON.stringify(cache));

    await cachingPromise;
    cachingPromise = null;
}

async function loadCachedLlmMiscountResponse(channelId, messages) {
    if (cachingPromise) await cachingPromise;

    const key = `${messages[0].id}-${messages[messages.length-1].id}`;

    const cacheFile = path.join(process.cwd(), 'cache', channelId, `llm-miscount-responses.json`);
    const cacheExists = await fs.access(cacheFile, fs.constants.F_OK).then(() => true).catch(() => false);

    if (cacheExists) {
        const cache = JSON.parse(await fs.readFile(cacheFile));
        return cache[key];
    } else {
        return null;
    }
}

exports.loadCachedMessage = loadCachedMessage;
exports.cacheMessages = cacheMessages;
exports.cacheLlmMiscountResponse = cacheLlmMiscountResponse;
exports.loadCachedLlmMiscountResponse = loadCachedLlmMiscountResponse;