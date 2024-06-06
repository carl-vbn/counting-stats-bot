const { OpenAI } = require('openai');
const { cacheLlmMiscountResponse, loadCachedLlmMiscountResponse } = require('./cache');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

function formatMessage(msg) {
    let text;
    if (msg.content?.trim()) {
        text = `${msg.content}`;
    } else if (msg.attachments.size > 0) {
        text = msg.attachments.filter(att => att.url).map(att => `${att.url}`).join(',');
    } else {
        text = '<empty message>';
    }

    return text;
}

// Will resolve the last message in the array and use the preceding messages to provide context
exports.resolveMessageNumber = async (messages) => {
    const prompt = messages.slice(0, messages.length - 1).map(formatMessage).join('\n') + '\n[' + formatMessage(messages[messages.length - 1]) + ']';
    const chatMessages = [
        {
            "role": "system",
            "content": [
                {
                    "type": "text",
                    "text": "You are a system designed to identify the numbers referred to in a sequence of messages you will be presented. These numbers don't have to be explicitly stated and can be hidden behind pop culture references. One of them will be selected by square brackets. Your task is to determine what number only that single message refers to. You can look at the other messages for guidance, as numbers will usually be in ascending order, but only evaluate te message in square brackets. If you don't think a message refers to a number, reply with the word \"NaN\". Do not explain your reasoning."
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "40\n41\n[life]"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "42"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "52\n53\n52\n[FUCK]"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "NaN"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "one\n2 dude... not again\n3 yeah...\n[the last message + 1]"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "4"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": prompt
                }
            ]
        }
    ];

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: chatMessages,
        temperature: 1,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
    });

    if (response.choices[0].message.content[0].toLowerCase() === 'nan') {
        return null;
    } else {
        try {
            return parseInt(response.choices[0].message.content);
        } catch (e) {
            console.error(e);
            return null;
        }
    }
}