const { Message, GuildMember } = require('discord.js');

/**
 * @param {Message[]} messages 
 * @returns {object[]}
 */
function getMostActiveCounters(messages) {
    const messagesPerMember = {};

    for (const msg of messages) {
        if (messagesPerMember.hasOwnProperty(msg.author.username)) {
            messagesPerMember[msg.author.username] += 1;
        } else {
            messagesPerMember[msg.author.username] = 1;
        }
    }

    return Object.entries(messagesPerMember).sort((a,b) => b[1]-a[1]);
}

function getHighestNumber(numbers) {
    let max = 0;
    for (let i = 0; i<numbers.length; i++) {
        const n = numbers[i];
        if (n != undefined && n > max && (i == 0 || numbers[i-1] == undefined || numbers[i-1] == n-1)) max = n;
    }

    return max;
}

function getChainCount(numbers) {
    let chainCount = 0;
    let chainSuccesses = 0;
    let nextExpectedNumber = 1;
    for (const n of numbers) {
        if (n == nextExpectedNumber) {
            chainSuccesses++;
            if (chainSuccesses == 2) chainCount++;
            nextExpectedNumber++;
        } else if (n == undefined) {
            nextExpectedNumber++;
        } else {
            nextExpectedNumber = n+1;
            chainSuccesses = 0;
        }
    }

    return chainCount;
}

exports.getMostActiveCounters = getMostActiveCounters;
exports.getHighestNumber = getHighestNumber;
exports.getChainCount = getChainCount;