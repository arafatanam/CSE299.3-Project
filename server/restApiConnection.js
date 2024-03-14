const axios = require('axios');

// Replace 'YOUR_API_KEY' with your actual OpenAI API key
const apiKey = 'YOUR_API_KEY';
const endpoint = 'https://api.openai.com/v1/completions';

async function fetchDataFromLLM(prompt) {
  try {
    const response = await axios.post(endpoint, {
      prompt: prompt,
      model: 'text-davinci-002', // Adjust the model as needed
      max_tokens: 50 // Adjust other parameters as needed
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': Bearer ${apiKey}
      }
    });
    return response.data; // Assuming the API returns JSON data
  } catch (error) {
    console.error('Error fetching data from LLM:', error);
    throw error;
  }
}

module.exports = {
  fetchDataFromLLM
};