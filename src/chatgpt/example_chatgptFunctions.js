// Example usage of src/chatgptFunctions.js
// Make sure to set OPENAI_API_KEY in your environment before running

const {
  chatgptCompletion,
  chatgptSearchCompletion,
  chatgptStructuredArray
} = require('./chatgptFunctions');

(async () => {
  // Common config
  const config = {
    systemMessage: 'You are an expert assistant. Be concise.',
    temperature: 0.2,
    top_p: 0.9,
    max_tokens: 200
  };

  // 1. Simple ChatGPT completion (with config)
  const completion = await chatgptCompletion('say hi in zh-cn', config);
  console.log('ChatGPT Completion:', completion, '\n');

  // 2. Search-augmented ChatGPT completion (with config)
  const searchCompletion = await chatgptSearchCompletion('bitcoin price today (reply in short)', config);
  console.log('Search Completion:', searchCompletion, '\n');

  // 3. Structured array output (e.g., generate questions, with config)
  const functionSchema = {
    name: "generate_item_of_array",
    description: "response with a list of items",
    parameters: {
      type: "object",
      properties: {
        answers: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["answers"]
    }
  };
  const answer = await chatgptStructuredArray('how to say hi in 5 different languages', functionSchema, config);
  console.log('Structured Array (answer):', answer);
})();
