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
from copy import deepcopy
import json

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


    def get_sections(self) -> List[str]:
        sections = set()
        if self.abstract:
            sections.add('Abstract')
        if self.title:
            sections.add('Title')
        if self.pdf_parse:
            pdf_parse: PdfParse = self.pdf_parse
            if pdf_parse.body_text:
                for text_block in pdf_parse.body_text:
                    if text_block.section:
                        sections.add(text_block.section)
            if pdf_parse.back_matter:
                for text_block in pdf_parse.back_matter:
                    if text_block.section:
                        sections.add(text_block.section)
        return list(sections)
    
    def filter_sections(self, mode: str, paper_sections_partially_matches: List[str]):
        print(f"Filtering paper sections to {mode} {paper_sections_partially_matches}")
        new_paper = deepcopy(self)
        if mode not in ['include', 'exclude']:
            raise ValueError("Mode must be either 'include' or 'exclude'")
        # Create a set of section names to match against
        match_set = set(paper_sections_partially_matches)

        # Filter out text blocks whose section names don't partially match
        filtered_blocks = []
        for block in new_paper.pdf_parse.body_text:
            if any(match.lower() in block.section.lower() for match in match_set):
                filtered_blocks.append(block)

        filtered_back_matters = []
        for block in new_paper.pdf_parse.back_matter:
            if any(match.lower() in block.section.lower() for match in match_set):
                filtered_back_matters.append(block)

        # Create a new Paper object with the filtered text blocks
        if mode == "include":
            filtered_paper = Paper(
                abstract=new_paper.abstract,
                title=new_paper.title,
                pdf_parse=PdfParse(
                    body_text=filtered_blocks,
                    back_matter=filtered_back_matters
                )
            )
        else:
            filtered_paper = Paper(
                abstract=new_paper.abstract,
                title=new_paper.title,
                pdf_parse=PdfParse(
                    body_text=[block for block in new_paper.pdf_parse.body_text if block not in filtered_blocks],
                    back_matter=[block for block in new_paper.pdf_parse.back_matter if block not in filtered_back_matters]
                )
            )

        if filtered_paper.pdf_parse.back_matter == filtered_paper.pdf_parse.body_text == []:
            print("Filtered was too harsh! Paper went blank! Returning original")
        else:
            self.__dict__.update(filtered_paper.__dict__)

    def to_text(self) -> str:
        sections = set()
        result = []

        if self.abstract:
            result.append(f'#### Abstract\n{self.abstract}')

        for text_block in self.pdf_parse.body_text + self.pdf_parse.back_matter:
            section = f"#### {text_block.sec_num or ''} {text_block.section}"
            if section not in sections:
                result.append(f"{section}\n{text_block.text}")
                sections.add(section)
            else:
                result[-1] += f"\n{text_block.text}"

        return '\n\n'.join(result)



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



def ask_text(prompt_template: str, completion_tokens=200, **kwargs):
    if sum([count_tokens(s) for s in [prompt_template, *kwargs.values()]]) > LLM_MAX_TOKENS:
        raise ValueError("Text is too long, must be less than " + str(LLM_MAX_TOKENS) + " tokens")
    
    llm = OpenAIChat(temperature=0, max_tokens=completion_tokens)

    prompt = PromptTemplate(input_variables=list(kwargs.keys()), template=prompt_template)

    chain = LLMChain(llm=llm, prompt=prompt)
    return chain.run(**kwargs)


def get_top_k_sections(k, text, labels):
    if len(labels) < k:
        print(f"Already has less than {k} sections, skipping")
        return labels
    
    print(f"Getting top {k} labels")
    # Fetch it from LLMs since multi-class 
    start = time.time()
    result = ask_text(prompt_template="""
        Give me a shortened list of the most relevant sections for the following text. 
        Text: {text}
        Sections: {labels}
        Most relevant {k} sections in JSON array format:
        """, k=str(k), text=text, labels=str(labels))
    end = time.time()
    print("Result: "+ result)
    print("Time taken to top k labels: " + str(end - start) + " seconds")
    try:
        return json.loads(result)
    except json.JSONDecodeError as e:
        print("Failed to parse result as JSON, returning all labels")
        return labels



async def ask_paper(question: str, paper: Paper, merge_at_end=True, results_speed_trade_off: int = 1):
    print("Asking paper")
    switcher = {
        0: None,
        1: 20,
        2: 14,
        3: 8,
        4: 3
    }
    top_k_sections = switcher.get(results_speed_trade_off, "invalid")
    if top_k_sections == "invalid":
        raise ValueError("Invalid valid for speed_acc_trade_off, must be one of " + str(list(switcher.keys())))
    
    if switcher.get(results_speed_trade_off) is not None:
        selected_sections = get_top_k_sections(k=top_k_sections, text=f"Question on paper article {paper.title}: {question}", labels=paper.get_sections())
        print("Selected sections: " + str(selected_sections))
        paper.filter_sections('include', selected_sections)


    if "this is a load test" in question.lower():
        return "This is a load test response"

    paper.filter_sections('exclude', ['reference', 'acknow', 'appendi', 'decl', 'supp'])

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

    full_context = paper.to_text()

    while True:
        contexts = split_text(full_context, context_max_tokens)

        context_sizes = [count_tokens(context) for context in contexts]
        print("Context sizes: ", context_sizes)

        sequence_sizes = [context_size + count_tokens(prompt.template) + completion_tokens for context_size in context_sizes]
        print("Sequence sizes: ", sequence_sizes)

        if max(sequence_sizes) > LLM_MAX_TOKENS:
            print("Sequences too big! Shortening..")
            completion_tokens -= 60
            context_max_tokens -= 200
        else:
            break
            

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

