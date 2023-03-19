import concurrent.futures

from utils.constants import MAX_CONTEXTS, LLM_MAX_TOKENS
from langchain.llms import OpenAIChat
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.text_splitter import CharacterTextSplitter

import tiktoken


def count_tokens(text) -> int:
    enc = tiktoken.get_encoding("gpt2")
    return int(len(enc.encode(text)) * 1.08)  # this is an estimate since it's been proved that underestimates


def decode(tokens) -> str:
    enc = tiktoken.get_encoding("gpt2")
    return enc.decode(tokens)


def split_text(text, chunk_size=3500):
    text_splitter = CharacterTextSplitter.from_tiktoken_encoder(chunk_size=chunk_size, chunk_overlap=0)
    texts = text_splitter.split_text(text)
    return texts


async def ask_llm(question, context):

    if "this is a load test" in question.lower():
        return "This is a load test response"

    prompt = PromptTemplate(
        input_variables=["context", "request"],
        template="""Please respond to the following request, denoted by \"'Request'\" in the best way possible with the
             given paper context that bounded by \"Start paper context\" and \"End paper context\". Everytime \"paper\"
             is mentioned, it is referring to paper context denoted by \"Start paper context\" and \"End paper context\".
             If the paper does not enough information for responding to the request, please respond with \"The paper does not contain enough information 
             for answering your question\". Your answer must not include ANY links that are not present in the paper context.\n
             Start paper context:
             {context}
             :End paper context.\n
             Request:\n'{request}'\n
             Response:\n
            """,
    )

    completion_tokens = 500
    context_max_tokens = LLM_MAX_TOKENS - count_tokens(question) - completion_tokens - count_tokens(prompt.template)
    print(f"context_max_tokens: {context_max_tokens}")
    contexts = split_text(context, context_max_tokens)

    llm = OpenAIChat(temperature=0, max_tokens=completion_tokens)
    chain = LLMChain(llm=llm, prompt=prompt)


    context_sizes = [count_tokens(context) for context in contexts]
    print("Context sizes: ", context_sizes)

    sequence_sizes = [context_size + count_tokens(prompt.template) + count_tokens(question) + completion_tokens for context_size in context_sizes]
    print("Sequence sizes: ", sequence_sizes)

    futures = []
    with concurrent.futures.ThreadPoolExecutor() as executor:
        for index, context in enumerate(contexts[:MAX_CONTEXTS]):
            print('Made request nr ' + str(index))
            futures.append(executor.submit(chain.run, request=question, context=context))

    responses = [f.result() for f in futures]

    if (len(responses) > 1):
        summary_prompt = PromptTemplate(
            input_variables=["responses", "question"],
            template="""Please append the following responses (denoted by 'Response N:') together in a way that no information is ommited
                   , duplicated, its sequentiality is kept (i.e 'Response N+1' contents come after 'Response N').
                    All of these different responses were an answer to an initial question
                    (denoted by 'Initial Question')
                    and your job is to put it all together in a way that it still faithfully answers the original question.
                    Do not try to combine web links.
                    Again, do not omite any information, do not duplicate any information, and keep the sequentiality of the responses.
                    {responses}
                    Initial Question:
                    {question}
                    Response:
                    """,
        )
        summary_prompt_length = count_tokens(summary_prompt.template) + sum([count_tokens(response) for response in responses]) + count_tokens(question)
        print("Summary prompt length: ",  + summary_prompt_length)
        llm = OpenAIChat(temperature=0, max_tokens=max(1000, LLM_MAX_TOKENS - summary_prompt_length))
        chain = LLMChain(llm=llm, prompt=summary_prompt)
        responses = [f"\n Response {i}: \n" + r for i, r in enumerate(responses)]
        response = chain.run(responses='\n'.join(responses), question=question)
        responses.append(response)

    return responses[-1]

