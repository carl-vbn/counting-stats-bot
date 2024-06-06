const { Message } = require('discord.js');
const fs = require('fs/promises');
const path = require('path');

let cachingPromise = null;

// Returns the path to the cache directory for a channel. Creates the directory if it doesn't exist.
async function channelCacheDir(channelId) {
    const dir = path.join(process.cwd(), 'cache', channelId);
    if (!(await fs.access(dir).then(() => true).catch(() => false))) {
        await fs.mkdir(dir);
    }

    return dir;
}

async function fileExists(filePath) {
    return await fs.access(filePath, fs.constants.F_OK).then(() => true).catch(() => false);
}

async function loadCachedMessage(channelId) {
    if (cachingPromise) await cachingPromise;

    const cacheDir = await channelCacheDir(channelId);
    const cacheFile = path.join(cacheDir, 'messages.json');
    const cacheExists = await fileExists(cacheFile);

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
    const cacheDir = await channelCacheDir(channelId);

    const cacheFile = path.join(cacheDir, 'messages.json');
    fs.writeFile(path.join(cacheDir, 'messages.recovery.json'), JSON.stringify(messages));
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

    const cacheDir = await channelCacheDir(channelId);

    const cacheFile = path.join(cacheDir, `llm-miscount-responses.json`);
    
    // Load existing cache if it exists
    let cache = {};
    const cacheExists = await fileExists(cacheFile);
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
    const cacheExists = await fileExists(cacheFile);

    if (cacheExists) {
        const cache = JSON.parse(await fs.readFile(cacheFile));
        return cache[key];
    } else {
        return null;
    }
}

async function cacheMessageNumberResolutions(channelId, msgNumberDict) {
    if (cachingPromise) await cachingPromise;

    const cacheDir = await channelCacheDir(channelId);
    let cache = {};
    const cacheFile = path.join(cacheDir, `number-resolutions.json`);
    const cacheExists = await fileExists(cacheFile);
    if (cacheExists) {
        cache = JSON.parse(await fs.readFile(cacheFile));
    }

    for (const [key, value] of Object.entries(msgNumberDict)) {
        cache[key] = value;
    }
    
    cachingPromise = fs.writeFile(cacheFile, JSON.stringify(cache));

    await cachingPromise;
    cachingPromise = null;
}

async function loadCachedMessageNumberResolutions(channelId, messages=undefined) {
    if (cachingPromise) await cachingPromise;

    const cacheFile = path.join(process.cwd(), 'cache', channelId, `number-resolutions.json`);
    const cacheExists = await fileExists(cacheFile);

    if (cacheExists) {
        const cache = JSON.parse(await fs.readFile(cacheFile));

        if (messages === undefined) {
            return cache;
        }
        
        const msgNumberDict = {};
        for (const msg of messages) {
            const key = msg.hasOwnProperty('id') ? msg.id : msg;
            msgNumberDict[key] = cache[msg.id];

            return msgNumberDict
        }

    } else {
        return null;
    }
}


exports.loadCachedMessage = loadCachedMessage;
exports.cacheMessages = cacheMessages;
exports.cacheLlmMiscountResponse = cacheLlmMiscountResponse;
exports.loadCachedLlmMiscountResponse = loadCachedLlmMiscountResponse;
exports.cacheMessageNumberResolutions = cacheMessageNumberResolutions;
exports.loadCachedMessageNumberResolutions = loadCachedMessageNumberResolutions;