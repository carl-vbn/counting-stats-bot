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
                        "text": "You are given a sequence of messages. Each message designates a number in an ascending sequence, either explicitly or implicitly. In some cases, the sequence will contain a message that breaks the ascending order. This can be inferred by the message itself, or the reactions that follow it. Your response should be a json object with two properties: 'miscount' and 'index'. 'miscount' should be a boolean indicating whether a miscount was found. 'index' should be the index of the message that breaks the sequence, or null if no miscount was found. Do not explain your reasoning."
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