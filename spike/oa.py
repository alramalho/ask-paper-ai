import json
import requests
API_TOKEN = "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"
headers = {"Authorization": f"Bearer {API_TOKEN}"}
API_URL = "https://api-inference.huggingface.co/models/microsoft/DialoGPT-large"


def convers(payload):
    data = json.dumps(payload)
    response = requests.request(
        "POST", "https://api-inference.huggingface.co/models/microsoft/DialoGPT-large", headers=headers, data=data)
    return json.loads(response.content.decode("utf-8"))


def generate(payload):
    data = json.dumps(payload)
    response = requests.request(
        "POST", "https://api-inference.huggingface.co/models/dim/dialogpt-medium-persona-chat", headers=headers, data=data)
    return json.loads(response.content.decode("utf-8"))


if __name__ == "__main__":
    # Normal repsonse = It's the best movie ever.
    # initial = convers({
    #     "inputs": {
    #         "past_user_inputs": [
    #             "Which movie is the best ?",
    #         ],
    #         "generated_responses": [
    #             "It's Die Hard for sure.",
    #         ],
    #         "text": "Can you explain why ?",
    #     },
    #     # "parameters": {
    #         # "max_time": 0.2,
    #     # },
    # })
    # print(json.dumps(initial, indent=4))
    responses = ["A: Which movie is the best? B: It's Die Hard for sure. A: Can you explain why ? B: "]
    for i in range(10):
        attempt = generate({
            "inputs": responses[-1],
            "parameters": {
                "max_time": 0.2,
            },
            "options": {
                "wait_for_model": True,
            }
        })
        responses.append(attempt[0]["generated_text"])
        print(responses[-1])


# Response
# {
#     "generated_text": "It's the best movie ever.",
#     "conversation": {
#         "past_user_inputs": [
#             "Which movie is the best ?",
#             "Can you explain why ?",
#         ],
#         "generated_responses": [
#             "It's Die Hard for sure.",
#             "It's the best movie ever.",
#         ],
#     },
#     "warnings": ["Setting `pad_token_id` to `eos_token_id`:50256 for open-end generation."],
# }
