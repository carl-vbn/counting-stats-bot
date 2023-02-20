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

function isBinary(numString) {
    return numString.split('').filter(c => c != '1' && c != '0').length == 0;
}

/**
 * @param {Message} message 
 * @param {object} commonMessageDict 
 * @returns 
 */
function findPossibleValues(message, commonMessageDict) {
    const possibleValues = [];
    const messageContent = message.content != undefined ? message.content : '';
    
    const numericValue = Number(messageContent);
    if (numericValue != NaN && numericValue % 1 === 0) {
        possibleValues.push(numericValue);
    }

    for (const [commonMessagePattern, associatedNumber] of Object.entries(commonMessageDict)) {
        if (messageContent.toLowerCase().match(commonMessagePattern.toLowerCase()) != null) {
            possibleValues.push(associatedNumber);
        }

        if (message.attachments != undefined) for (const attachment of message.attachments) {
            if (attachment[1].url.toLowerCase().match(commonMessagePattern.toLowerCase()) != null) {
                possibleValues.push(associatedNumber);
            }
        }
    }

    if (isBinary(messageContent)) possibleValues.push(parseInt(messageContent, 2));
    
    const withoutParenthesis = messageContent.split('(')[0].trim();
    if (withoutParenthesis != messageContent) {
        const parenthesisContent = messageContent.split('(')[1].split(')')[0];
        if (withoutParenthesis.length > 0) possibleValues.push(...findPossibleValues(withoutParenthesis, commonMessageDict));
        if (parenthesisContent.length > 0) possibleValues.push(...findPossibleValues(parenthesisContent, commonMessageDict));
    }

    return new Set(possibleValues);
}

// Tries to add missing numbers by infering them from surrounding numbers
function assignNumbers(messages) {
    const commonMessages = require('../common_messages.json');
    const messagePossibleValues = messages.map(msg => findPossibleValues(msg, commonMessages));

    let startIndex = 0;
    while (startIndex < messagePossibleValues.length-1) {
        if (messagePossibleValues[startIndex].length > 0) {
            for (let i = 1; true; i++) {
                if (startIndex+i >= messagePossibleValues.length) {
                    // Reached the end of the list

                    return;
                }

                if (messagePossibleValues[startIndex+i].length > 0) {
                    const matchingNumbers = messagePossibleValues[startIndex].filter(num => messagePossibleValues[startIndex+i].includes(num+i));
                    if (matchingNumbers.length > 0) {
                        // Fill all values between startIndex and startIndex+i (excluded)
                        for (let j = 1; j<i; j++) messagePossibleValues[startIndex+j] = matchingNumbers.map(num => num+j);
                    } else {
                        // This means the count was broken somewhere in between
                    }

                    startIndex+=i;
                    while (messagePossibleValues[startIndex+1].length > 0) { startIndex++ }
                    break;
                }
//
            }
        } else {
            startIndex++;
        }
    }

    // Filter out impossible values. TODO: Improve
    for (let i = 0; i<messagePossibleValues.length; i++) {
        messagePossibleValues[i] = new Set([...messagePossibleValues[i]].filter(val => val < 1000));
        if (i > 0 && i < messagePossibleValues.length-1 && messagePossibleValues[i-1].length > 0 && messagePossibleValues[i+1].length > 0) {
            messagePossibleValues[i] = new Set([...messagePossibleValues[i]].filter(val => messagePossibleValues[i-1].includes(val-1) && messagePossibleValues[i+1].includes(val+1)));
        }
    }

    return messagePossibleValues.map(s => s.values().next().value);
}

/**
 * Goes through all messages in the specified channel, extracts numbers where it can and tries to fill in the missing numbers through interpolation
 * @param {TextChannel} channel
 * @returns {number[]} List of numbers, with "null" where numbers could not be filled in
 */
exports.crawlAll = (async function(channel) {
    const messages = await retrieveMessages(channel);
    const assignedNumbers = assignNumbers(messages);
    return {messages: messages, numbers: assignedNumbers};
});