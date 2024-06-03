const { OpenAI } = require('openai');
const { cacheLlmMiscountResponse, loadCachedLlmMiscountResponse } = require('./cache');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const dummyNames = [
    "Alice",
    "Bob",
    "Charlie",
    "David",
    "Eve",
    "Frank",
    "Grace",
    "Heidi",
    "Ivan",
    "Judy",
    "Kevin",
    "Linda",
    "Mallory",
    "Niaj",
    "Oscar",
    "Peggy",
    "Quentin",
    "Romeo",
    "Sue",
    "Trent",
    "Ursula",
    "Victor",
    "Walter",
    "Xavier",
    "Yvonne",
    "Zoe"
];

const PROMPT = `What follows is an excerpt from an online chat where the goal is to send numbers in a continuously ascending order. Numbers don't have to be explicitly stated, they can also be send in the form of image links or a reference to the number (usually from web culture). Sometimes, people mess up, either by sending the wrong number, sending a number that has already been sent, or by sending a message that isn't part of the sequence. One person is also not allowed to send more than one message in a row. Your task is to check if such a mistake happened. \n\nA mistake happens if and only if at least one of the following conditions is true:\n- The count restarts from 1\n- Messages show surprise, confusion or disappointment following a mistake\nIf both conditions are not met, you must assume the sequence is correct, even if it is not clear why. If one or both are met, you must read the messages sent before the confusion or the restart, and determine which one(s) is/are a mistake.\n\nYou will reply with a JSON object that has two properties: "miscount", a boolean value set to true if a mistake was detected, and "line", the line number at which the first mistake happened, or null if no mistake happened.\n\n`;

function formatMessage(msg, index, assignedDummyNames) {
    const authorName = msg.author?.id ? assignedDummyNames[msg.author.id] : 'Unknown';
    let text;
    if (msg.content?.trim()) {
        text = `"${msg.content}"`;
    } else if (msg.attachments.size > 0) {
        text = msg.attachments.map(attachment => attachment.url).join('\n');
    } else {
        text = '<empty message>';
    }

    return `${index+1}. ${authorName}: ${text}`;
}

exports.findMiscount = async (channelId, msgs) => {
    const cachedResponse = await loadCachedLlmMiscountResponse(channelId, msgs);
    if (cachedResponse) {
        return cachedResponse;
    }

    const assignedDummyNames = {};

    let nextDummyNameIndex = 0;
    for (const msg of msgs) {
        if (msg.author?.id) {
            if (!assignedDummyNames[msg.author.id]) {
                assignedDummyNames[msg.author.id] = dummyNames[nextDummyNameIndex++];
            }
            
            if (nextDummyNameIndex >= dummyNames.length) {
                nextDummyNameIndex = 0;
            }
        }
    }

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            // {
            //     "role": "system",
            //     "content": [
            //         {
            //             "type": "text",
            //             "text": "You are verifying a sequence of messages sent by people trying to count in an online chat. To be considered valid, every message must designate a number in a continuously ascending sequence, either explicitly (the message is the number) or implicitly (the message refers to the number in a creative way). If a message is repeated, the second occurrence is invalid. Invalid messages often lead to comments from others and cause a restart from 1. Some messages are image links referring to a number, and are not necessarily invalid. You can infer the value of an image link from the surrounding messages or the URL itself. If an image is followed by a number above 1, it is probably valid. Your response should be a json object with two properties: 'miscount' and 'index'. 'miscount' should be a boolean indicating whether an invalid message was found. 'index' should be the index (not the value!) of the first invalid message according to these rules, or null if all messages are valid. Do not explain your reasoning."
            //         }
            //     ]
            // },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": PROMPT + msgs.map((msg, index) => formatMessage(msg, index, assignedDummyNames)).join("\n")
                    }
                ]
            }
        ],
        temperature: 1,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        response_format: {type: "json_object"}
    });

    console.log(msgs.map((msg, index) => formatMessage(msg, index, assignedDummyNames)).join("\n"));

    try {
        const lineStr = JSON.parse(response.choices[0].message.content).line;
        if (lineStr === null || lineStr == 'null') return null;
        let responseIndex = parseInt(lineStr)-1;

        await cacheLlmMiscountResponse(channelId, msgs, responseIndex);

        return responseIndex;
    } catch (e) {
        console.error(e);
        return null;
    }
};