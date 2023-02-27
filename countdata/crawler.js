const { TextChannel, Message } = require('discord.js');
const { loadCache, cacheMessages } = require('./cache');

/**
 * @param {TextChannel} channel 
 */
async function loadAllMessages(channel) {
    console.log(`Loading all messages in channel '${channel.name}'...`);

    // Create message pointer
    let message = await channel.messages
        .fetch({ limit: 1 })
        .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));

    let messages = [message];

    while (message) {
        await channel.messages
            .fetch({ limit: 100, before: message.id })
            .then(messagePage => {
                messagePage.forEach(msg => messages.push(msg));
                console.log(messages.length);

                // Update our message pointer to be last message in page of messages
                message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
            });
    }

    console.log(`Done loading all messages in channel '${channel.name}'.`);

    return messages.sort((a,b) => a.createdTimestamp - b.createdTimestamp);
}

/**
 * @param {TextChannel} channel 
 */
async function retrieveMessages(channel, ignoreCache=false) {
    const cache = ignoreCache ? [] : await loadCache(channel.id);
    if (cache.length == 0) {
        const messages = await loadAllMessages(channel);
        await cacheMessages(channel.id, messages);
        return messages;
    }

    let message = cache[cache.length-1];
    const newMessages = [];

    while (message) {
        await channel.messages
            .fetch({ limit: 100, after: message.id })
            .then(messagePage => {
                messagePage = messagePage.sort((a,b) => a.createdTimestamp - b.createdTimestamp);
                messagePage.forEach(msg => newMessages.push(msg));

                // Update our message pointer to be last message in page of messages
                message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
            });
    }

    cache.push(...newMessages);

    await cacheMessages(channel.id, cache);

    return cache;
}

/**
 * Goes through all messages in the specified channel, extracts numbers where it can and tries to fill in the missing numbers through interpolation
 * @param {TextChannel} channel
 * @returns {number[]} List of numbers, with "null" where numbers could not be filled in
 */
exports.crawlAll = (async function(channel) {
    return await retrieveMessages(channel);
});