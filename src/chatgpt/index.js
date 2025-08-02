// Unified ChatGPT Functions Utility
// Provides: chatgptCompletion, chatgptSearchCompletion, chatgptStructuredArray
// Requires: OPENAI_API_KEY in environment

const axios = require('axios');

/**
 * Basic ChatGPT completion (prompt → completion)
 * @param {string} prompt
 * @param {object} [config] - { model, systemMessage, temperature, top_p, presence_penalty, frequency_penalty, max_tokens }
 * @returns {Promise<string>} completion
 */
async function chatgptCompletion(prompt, config = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY environment variable not set');
  const model = config.model || 'gpt-4o-mini';
  const systemMessage = config.systemMessage || 'Be precise and concise.';
  const url = 'https://api.openai.com/v1/chat/completions';
  const payload = {
    model,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: prompt }
    ],
    temperature: config.temperature ?? 0.2,
    top_p: config.top_p ?? 0.9,
    presence_penalty: config.presence_penalty ?? 0,
    frequency_penalty: config.frequency_penalty ?? 1,
    max_tokens: config.max_tokens ?? 512
  };
  console.log(`OpenAI API call - chatgptCompletion: ${model}, prompt length: ${prompt.length}`);
  const response = await axios.post(url, payload, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });
  return response.data.choices[0].message.content;
}

/**
 * ChatGPT search-augmented completion (prompt → web search completion)
 * @param {string} prompt
 * @param {object} [config] - { model, systemMessage, temperature, top_p, presence_penalty, frequency_penalty, max_tokens }
 * @returns {Promise<string>} completion
 */
async function chatgptSearchCompletion(prompt, config = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY environment variable not set');
  const model = config.model || 'gpt-4o-mini';
  const url = 'https://api.openai.com/v1/responses';
  // Only include supported parameters for /v1/responses endpoint
  const payload = {
    model,
    input: prompt,
    tools: [{ type: 'web_search' }],
    temperature: config.temperature ?? 0.2,
    top_p: config.top_p ?? 0.9
    // DO NOT include presence_penalty, frequency_penalty, max_tokens, or system_message
  };
  // Note: /v1/responses does NOT support system_message

  console.log(`OpenAI API call - chatgptSearchCompletion: ${model}, prompt length: ${prompt.length}`);
  const response = await axios.post(url, payload, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });
  // Find first non-empty completion
  for (const out of response.data.output) {
    if (out.content && out.content.length > 0) {
      return out.content[0].text;
    }
  }
  return '';
}

/**
 * ChatGPT function call for structured 1xn array output
 * @param {string} prompt
 * @param {object} functionSchema - OpenAI function schema for array output
 * @param {object} [config] - { model, systemMessage, temperature, top_p, presence_penalty, frequency_penalty, max_tokens }
 * @returns {Promise<Array>} structured array (e.g., questions)
 */
async function chatgptStructuredArray(prompt, functionSchema, config = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY environment variable not set');
  const model = config.model || 'gpt-4o-mini';
  const url = 'https://api.openai.com/v1/chat/completions';
  const payload = {
    model,
    messages: [
      { role: 'system', content: config.systemMessage || 'Please strictly follow the function return format.' },
      { role: 'user', content: prompt }
    ],
    functions: [functionSchema],
    function_call: { name: functionSchema.name },
    temperature: config.temperature ?? 0.2,
    top_p: config.top_p ?? 0.9,
    presence_penalty: config.presence_penalty ?? 0,
    frequency_penalty: config.frequency_penalty ?? 1,
    max_tokens: config.max_tokens ?? 200
  };
  console.log(`OpenAI API call - chatgptStructuredArray: ${model}, prompt length: ${prompt.length}`);
  const response = await axios.post(url, payload, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });
  const args = response.data.choices[0].message.function_call.arguments;
  // Assume output is always a JSON string with the array under a key (e.g., questions)
  let obj;
  try {
    obj = JSON.parse(args);
  } catch (parseError) {
    console.error('JSON parse error:', parseError.message);
    console.error('Raw arguments:', args);
    return [];
  }  
  // The function schema expects array under "keywords" property
  if (obj.keywords && Array.isArray(obj.keywords)) {
    return obj.keywords;
  }
  
  // Fallback: look for any array property
  for (const key in obj) {
    if (Array.isArray(obj[key])) return obj[key];
  }
  
  // No array found, return empty array
  console.warn('No valid array found in API response');
  return [];
}

module.exports = {
  chatgptCompletion,
  chatgptSearchCompletion,
  chatgptStructuredArray
};
