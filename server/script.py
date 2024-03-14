import requests

# Set up API key and endpoint
api_key = 'your-api-key'
endpoint = 'https://api.openai.com/v1/engines/tiny-llama/completions'

# Construct request payload
data = {
    'prompt': 'Once upon a time,',
    'max_tokens': 50
}

# Send POST request to LLM Studio API
headers = {'Authorization': f'Bearer {api_key}'}
response = requests.post(endpoint, json=data, headers=headers)

# Handle response
if response.status_code == 200:
    completion = response.json()['choices'][0]['text']
    print("Completion:", completion)
else:
    print("Error:", response.text)