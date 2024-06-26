const { Message, GuildMember } = require('discord.js');

const { resolveMessageNumber } = require('./openai');
const { cacheMessageNumberResolutions, loadCachedMessageNumberResolutions } = require('./cache');
const commonMessageDict = require('../common_messages.json');
const ignoredTimeranges = require('../ignored_timeranges.json');

function isBinary(numString) {
    return numString.length > 0 && numString.split('').filter(c => c != '1' && c != '0').length == 0;
}

/**
 * @param {Message} message 
 * @returns 
 */
function findPossibleValues(message) {
    const possibleValues = [];
    const messageContent = message.content != undefined ? message.content : '';
    
    let unsure = true; // True means it could be a value not added to possibleValues

    const numericValue = Number(messageContent);
    if (!isNaN(numericValue) && numericValue % 1 === 0) {
        possibleValues.push(numericValue);
        unsure = false;
    }

    if (messageContent.endsWith('!')) {
        const withoutMarks = messageContent.replace(/!/g, '');
        const number = Number(withoutMarks);
        if (!isNaN(number) && number % 1 === 0) {
            possibleValues.push(number);

            if (number < 8 && number > 0) {
                const fact = function(n) {
                    if (n == 0) return 1;
                    return (n * fact(n - 1));
                }

                possibleValues.push(fact(number));
            }

            unsure = false;
        }
    }

    if (messageContent.includes('^')) {
        const operands = messageContent.split('^');
        if (operands.length == 2) {
            const a = Number(operands[0]);
            const b = Number(operands[1]);
            const result = Math.pow(a, b);
            if (!isNaN(result)) {
                possibleValues.push(result)
                unsure = false;
            }
        }
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
        if (withoutParenthesis.length > 0) possibleValues.push(...findPossibleValues(withoutParenthesis));
        if (parenthesisContent.length > 0) possibleValues.push(...findPossibleValues(parenthesisContent));
    }

    let identifiedNumberWord = null;
    for (const word of messageContent.split(' ')) {
        let parsed = parseInt(word);
        if (!isNaN(parsed)) {
            if (identifiedNumberWord != null) {
                // There already was a number word, so we can't pick one
                identifiedNumberWord = null;
                break;
            }

            identifiedNumberWord = parsed;
        }
    }
    
    if (identifiedNumberWord != null) possibleValues.push(identifiedNumberWord);
            
    return Array.from(new Set(possibleValues));
}

/**
 * @param {Message[]} messages 
 * @returns {object[]}
 */
function getMostActiveCounters(messages) {
    const messagesPerMember = {};

    for (const msg of messages) {
        if (messagesPerMember.hasOwnProperty(msg.author.id)) {
            messagesPerMember[msg.author.id]['messagesSent'] += 1;
        } else {
            messagesPerMember[msg.author.id] = {messagesSent: 1, username: msg.author.username};
        }
    }

    return Object.entries(messagesPerMember).sort((a,b) => b[1].messagesSent-a[1].messagesSent);
}

function shouldIgnoreMessage(message, channelId) {
    if (ignoredTimeranges.hasOwnProperty(channelId)) {
        for (const ignoredTimerange of ignoredTimeranges[channelId]) {
            if (message.createdTimestamp >= ignoredTimerange.from && message.createdTimestamp <= ignoredTimerange.to) {
                return true;
            }
        }
    }

    return false;
}

function analyze(messages, channelId, maxUnsureDistance, dontIgnore=false) {
    messages = messages.sort((a,b) => a.createdTimestamp - b.createdTimestamp);

    const assignedNumbers = {};
    let chainCount = 0;
    let highestNumber = 0;
    let onethousandMessage = null;

    let cursor = messages.length-1;

    while (cursor > 0) {
        if (!dontIgnore && shouldIgnoreMessage(messages[cursor], channelId)) {
            cursor--;
            continue;
        }

        for (const possibleValue of findPossibleValues(messages[cursor])) {
            let successfulMatches = 0;
            for (let offset = 1; offset <= maxUnsureDistance && cursor-offset >= 0; offset++) {
                // console.log(`${findPossibleValues(messages[cursor-offset])} vs ${possibleValue}-${offset}`);
                if (findPossibleValues(messages[cursor-offset]).includes(possibleValue-offset)) successfulMatches++;
            }

            if (successfulMatches >= 2) {
                for (let offset = 0; offset < possibleValue && cursor-offset >= 0; offset++) {
                    const number = possibleValue - offset;
                    assignedNumbers[messages[cursor-offset].id] = number;

                    if (number == 1000) onethousandMessage = messages[cursor-offset];

                    if (number > highestNumber) highestNumber = number;
                }

                chainCount++;
                cursor -= (possibleValue - 1);

                break;
            }
        }

        cursor--;
    }

    return {assignedNumbers: assignedNumbers, chainCount: chainCount, highestNumber: highestNumber, mostActiveCounters: getMostActiveCounters(messages), onethousandMessage: onethousandMessage};
}

async function findMiscounts(channelId, messages, assignedNumbers) {
    console.log('Finding miscounts...');
    const miscounts = [];

    let lastPossibleValues = undefined;
    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const assignedNumber = assignedNumbers[msg.id];

        if (assignedNumber != undefined) {
            if (lastPossibleValues == undefined) {
                lastPossibleValues = [assignedNumber];
                continue;
            }

            if (lastPossibleValues.some(v => v + 1 == assignedNumber)) {
                lastPossibleValues = [assignedNumber];
                continue;
            } else {
                miscounts.push(msg);
                lastPossibleValues = undefined;
            }
        } else {
            let possibleValues = findPossibleValues(msg);
            if (possibleValues.length == 0) {
                miscounts.push(msg);
                lastPossibleValues = undefined;
            } else {
                if (lastPossibleValues != undefined) {
                    if (possibleValues.some(v => lastPossibleValues.some(lv => lv + 1 == v))) {
                        lastPossibleValues = possibleValues;
                    } else {
                        miscounts.push(msg);
                        lastPossibleValues = undefined;
                    }
                } else {
                    lastPossibleValues = possibleValues;
                }
            }
        }
    }

    return miscounts;
}

exports.analyze = analyze;
exports.findMiscounts = findMiscounts;