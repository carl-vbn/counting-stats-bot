const { OpenAI } = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

exports.findMiscount = async (msgs) => {
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                "role": "system",
                "content": [
                    {
                        "type": "text",
                        "text": "You are given a sequence of messages. Each message designates a number in an ascending sequence, either explicitly or implicitly. Your task is to identify the message that breaks the sequence, and return its index in a JSON object with property \"index\". If no such message is identified, return null. Do not explain your choice."
                    }
                ]
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": msgs.map((msg, index) => `msg[${index}]="${msg}"`).join("\n")
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

    try {
        const indexStr = JSON.parse(response.choices[0].message.content).index;
        if (indexStr === null || indexStr == 'null') return null;
        return parseInt(indexStr);
    } catch (e) {
        console.error(e);
        return null;
    }
};