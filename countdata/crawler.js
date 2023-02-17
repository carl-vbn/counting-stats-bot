const { TextChannel, Message } = require('discord.js');

/**
 * 
 * @param {TextChannel} channel 
 */
async function retrieveMessages(channel) {
    console.log(`Retrieving all messages in channel ${channel.name}...`)

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

                // Update our message pointer to be last message in page of messages
                message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
            });
    }

    return messages;
}

/**
 * Constructs a {messageId: number} object from a list of Discord messages
 * Messages that can't "numerized" will be assigned null
 * @param {Message[]} messages 
 */
function assignNumbers(messages) {
    const commonMessages = require('../common_messages.json');
    const assignedNumbers = {};

    for (const message of messages) {
        const content = message.content;

        const numericContent = Number(content);
        if (numericContent != NaN && numericContent % 1 === 0) { // Number is stricter than parseInt but can also parse floats so we need to check if the remainder is null.
            assignedNumbers[message.id] = numericContent;
        } else {
            const normalizedContent = content.toLowerCase().replace(/!/g, '');
            if (commonMessages.text.hasOwnProperty(normalizedContent)) {
                assignedNumbers[message.id] = commonMessages[normalizedContent];
            } else {
                for (const mediaEntry of Object.entries(commonMessages.media)) {
                    if (content.includes(mediaEntry[0])) {
                        assignedNumbers[message.id] = mediaEntry[1];
                        break;
                    } else {
                        let doBreak = false;
                        message.attachments.forEach((attachment) => {
                            if (!doBreak && attachment.url.includes(mediaEntry[0])) {
                                assignedNumbers[message.id] = mediaEntry[1];
                                doBreak = true;
                            }
                        });

                        if (doBreak) break;
                    }
                }

                if (!assignedNumbers.hasOwnProperty(message.id)) {
                    assignedNumbers[message.id] = null;
                }
            }
        }

    }

    return assignedNumbers;
}

// Tries to add missing numbers by infering them from surrounding numbers
function fillByInterpolation(numberList) {
    let startIndex = 0;
    while (startIndex < numberList.length-1) {
        if (numberList[startIndex] != null) {
            for (let i = 1; true; i++) {
                if (startIndex+i >= numberList.length) {
                    // Reached the end of the list

                    return;
                }

                if (numberList[startIndex+i] != null) {
                    if (numberList[startIndex+i] == numberList[startIndex] + i) {
                        // Fill all values between startIndex and startIndex+i (excluded)
                        for (let j = 1; j<i; j++) numberList[startIndex+j] = numberList[startIndex] + j;
                    } else {
                        // This means the count was broken somewhere in between
                    }

                    startIndex+=i;
                    while (numberList[startIndex+1] != null) { startIndex++ }
                    break;
                }
//
            }
        } else {
            startIndex++;
        }
    }
}

/**
 * Goes through all messages in the specified channel, extracts numbers where it can and tries to fill in the missing numbers through interpolation
 * @param {TextChannel} channel
 * @returns {number[]} List of numbers, with "null" where numbers could not be filled in
 */
exports.crawlAll = (async function(channel) {
    const messages = await retrieveMessages(channel);
    const assignedNumbers = assignNumbers(messages);
    const numbers = Object.entries(assignedNumbers).sort((a,b) => a[0].localeCompare(b[0])).map(e => e[1]); // Sort numbers by the message id (chronological order) and remove the message ID afterwards (only keep numbers)
    fillByInterpolation(numbers); // Fill in as many missing numbers as possible
    return numbers;
});