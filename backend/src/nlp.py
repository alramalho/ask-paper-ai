import concurrent.futures
import time
from pydantic import BaseModel
from typing import List, Union, Set

from utils.constants import MAX_CONTEXTS, LLM_MAX_TOKENS
from langchain.llms import OpenAIChat
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.text_splitter import MarkdownTextSplitter

import tiktoken

class TextBlock(BaseModel):
    text: str
    section: str
    sec_num: Union[int, None, str]

class PdfParse(BaseModel):
    body_text: List[TextBlock]
    back_matter: List[TextBlock]


class Paper(BaseModel):
    abstract: str
    title: str
    pdf_parse: PdfParse


def count_tokens(text) -> int:
    if text is None: return 0
    enc = tiktoken.get_encoding("gpt2")
    return int(len(enc.encode(text, disallowed_special=())))


def decode(tokens) -> str:
    enc = tiktoken.get_encoding("gpt2")
    return enc.decode(tokens)


def split_text(text, chunk_size=3500):
    text_splitter = MarkdownTextSplitter.from_tiktoken_encoder(chunk_size=chunk_size, chunk_overlap=0)
    texts = text_splitter.split_text(text)
    return texts


def filter_paper_sections(paper: Paper, mode: str, paper_sections_partially_matches: List[str]) -> Paper:
    if mode not in ['include', 'exclude']:
        raise ValueError("Mode must be either 'include' or 'exclude'")
    # Create a set of section names to match against
    match_set = set(paper_sections_partially_matches)

    # Filter out text blocks whose section names don't partially match
    filtered_blocks = []
    for block in paper.pdf_parse.body_text:
        if any(match.lower() in block.section.lower() for match in match_set):
            filtered_blocks.append(block)

    filtered_back_matters = []
    for block in paper.pdf_parse.back_matter:
        if any(match.lower() in block.section.lower() for match in match_set):
            filtered_back_matters.append(block)

    # Create a new Paper object with the filtered text blocks
    if mode == "include":
        filtered_paper = Paper(
            abstract=paper.abstract,
            title=paper.title,
            pdf_parse=PdfParse(
                body_text=filtered_blocks,
                back_matter=filtered_back_matters
            )
        )
    else:
        filtered_paper = Paper(
            abstract=paper.abstract,
            title=paper.title,
            pdf_parse=PdfParse(
                body_text=[block for block in paper.pdf_parse.body_text if block not in filtered_blocks],
                back_matter=[block for block in paper.pdf_parse.back_matter if block not in filtered_back_matters]
            )
        )

    if filtered_paper.pdf_parse.back_matter == filtered_paper.pdf_parse.body_text == []:
        print("Filtered was too harsh! Paper went blank! Returning original")
        return paper
    else:
        return filtered_paper
def paper_to_text(json_obj: Paper) -> str:
    sections = set()
    result = []

    if json_obj.abstract:
        result.append(f'#### Abstract\n{json_obj.abstract}')

    for text_block in json_obj.pdf_parse.body_text + json_obj.pdf_parse.back_matter:
        section = f"#### {text_block.sec_num or ''} {text_block.section}"
        if section not in sections:
            result.append(f"{section}\n{text_block.text}")
            sections.add(section)
        else:
            result[-1] += f"\n{text_block.text}"

    return '\n\n'.join(result)



async def ask_llm(question: str, paper: Paper, merge_at_end=True):

    if "this is a load test" in question.lower():
        return "This is a load test response"

    paper = filter_paper_sections(paper, 'exclude', ['reference', 'acknow', 'appendi', 'decl', 'supp'])

    prompt = PromptTemplate(
        input_variables=["context", "request"],
        template="""Please respond to the following request, denoted by \"'Request'\" in the best way possible with the
             given paper context that bounded by \"Start paper context\" and \"End paper context\". Everytime \"paper\"
             is mentioned, it is referring to paper context denoted by \"Start paper context\" and \"End paper context\".
             If the paper does not enough information for responding to the request, please respond with \"The paper does not contain enough information
             for answering your question\".
             Your answer must only include information that is explicitly present in the paper context.
             Your answer must not include ANY links that are not present in the paper context.
             Start paper context:
             {context}
             :End paper context.\n
             Request:\n'{request}'\n
             Response:\n
            """,
    )

    completion_tokens = 600
    context_max_tokens = LLM_MAX_TOKENS - completion_tokens - count_tokens(prompt.template)
    print(f"context_max_tokens: {context_max_tokens}")

    full_context = paper_to_text(paper)

    sequence_sizes = None
    while sequence_sizes is None or max(sequence_sizes) > LLM_MAX_TOKENS:
        contexts = split_text(full_context, context_max_tokens)

        context_sizes = [count_tokens(context) for context in contexts]
        print("Context sizes: ", context_sizes)

        sequence_sizes = [context_size + count_tokens(prompt.template) + completion_tokens for context_size in context_sizes]
        print("Sequence sizes: ", sequence_sizes)

        if max(sequence_sizes) > LLM_MAX_TOKENS:
            print("Sequences too big! Shortening..")
            completion_tokens -= 60
            context_max_tokens -= 200

    llm = OpenAIChat(temperature=0, max_tokens=completion_tokens)
    chain = LLMChain(llm=llm, prompt=prompt)

    def wrapper(request, context, index):
        print("Running chain nr " + str(index))
        start = time.time()
        result = chain.run(request=request, context=context)
        elapsed_time = time.time() - start
        print(f"Elapsed time for chain nr {str(index)}: {elapsed_time:.2f} seconds")
        return result

    futures = []
    with concurrent.futures.ThreadPoolExecutor() as executor:
        for index, context in enumerate(contexts[:MAX_CONTEXTS]):
            futures.append(executor.submit(wrapper, request=question, context=context, index=index))

    responses = [f.result() for f in futures]

    if (len(responses) > 1):
        if merge_at_end:
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
        else:
            response = "\n".join(responses)
        responses.append(response)

    return responses[-1]

