const axios = require('axios');

async function fetchDataFromApi(prompt) {
  try {
    const response = await axios.get('http://your-api-endpoint.com/pyscript', {
      params: {
        prompt: prompt
      }
    });
    return response.data; // Assuming the API returns JSON data
  } catch (error) {
    console.error('Error fetching data from API:', error);
    throw error;
  }
}

module.exports = {
  fetchDataFromApi
};