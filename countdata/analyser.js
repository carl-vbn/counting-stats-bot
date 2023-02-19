const { Message, GuildMember } = require('discord.js');

/**
 * @param {Message[]} messages 
 * @returns {object[]}
 */
function getMostActiveCounters(messages) {
    const messagesPerMember = {};

    for (const msg of messages) {
        if (messagesPerMember.hasOwnProperty(msg.member.user.username)) {
            messagesPerMember[msg.member.user.username] += 1;
        } else {
            messagesPerMember[msg.member.user.username] = 1;
        }
    }

    return Object.entries(messagesPerMember).sort((a,b) => b[1]-a[1]);
}

function getHighestNumber(numbers) {
    let max = 0;
    for (const n of numbers) {
        if (n > max) max = n;
    }

    return max;
}

function getChainCount(numbers) {
    let chainCount = 1;
    let nextExpectedNumber = 1;
    for (const n of numbers) {
        if (n != null && n != nextExpectedNumber) {
            chainCount++;
            nextExpectedNumber = n+1;
        } else {
            nextExpectedNumber++;
        }
    }

    return chainCount;
}

exports.getMostActiveCounters = getMostActiveCounters;
exports.getHighestNumber = getHighestNumber;
exports.getChainCount = getChainCount;