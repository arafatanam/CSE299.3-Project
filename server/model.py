from openai import OpenAI

client = OpenAI(base_url="http://localhost:1234/v1", api_key="not-needed")

question = input("Enter the question: ")
criteria = input("Enter the criteria: ")
rubrics = input("Enter the rubrics: ")

messages = [
    {"role": "system", "content": f"{question} Criteria: {criteria} Rubrics: {rubrics}"},
    {"role": "user", "content": "Provide your response here."}
]

completion = client.chat.completions.create(
    model="local-model",
    messages=messages,
    temperature=0.7,
)

print(completion.choices[0].message)
