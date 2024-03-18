import sys
from openai import OpenAI


# Check if the correct number of arguments is provided
if len(sys.argv) != 1:
    print("Usage: python script.py")
    sys.exit(1)


# Example data from dataset
dataset = [
    {"role": "user", "content": "Hello, AI. Can you evaluate this answer for me?"},
    {"role": "system", "content": "Sure, please provide the answer."},
    {"role": "user", "content": "Here is the answer: [Provide the answer here]"},
    {"role": "system", "content": "Thank you. Let me analyze it."},
    {"role": "system", "content": "Based on the criteria, I would assign this answer [mark out of 10]."},
    {"role": "user", "content": "Great! Can you evaluate another answer?"},
    {"role": "system", "content": "Of course, go ahead and provide the answer."},
    {"role": "user", "content": "[Provide the answer]"},
    {"role": "system", "content": "Analyzing..."},
    {"role": "system", "content": "This answer meets the criteria well. I would give it [mark out of 10]."},
    # More conversation history can be added here for evaluating additional answers
]


client = OpenAI(base_url="http://localhost:1234/v1", api_key="not-needed")


history = [
    {"role": "system", "content": "You are an AI tasked with judging answers to questions and assigning marks accordingly."},
]


for data in dataset:
    completion = client.chat.completions.create(
        model="local-model", # this field is currently unused
        messages=history + [data],  # Append current data to the history
        temperature=0.7,
        stream=True,
    )


    for chunk in completion:
        if chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content, end="", flush=True)


    print()
    sys.stdout.flush()  # Flush stdout to ensure output is sent immediately


sys.exit(0)  # Terminate the script after processing the input
