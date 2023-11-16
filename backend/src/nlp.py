import concurrent.futures
import json
import threading
import time
from copy import deepcopy
from queue import Queue
from typing import (Any, Callable, Dict, Generator, List, Literal, Optional,
                    Union)

import openai
import tiktoken
from bs4 import BeautifulSoup
from langchain.text_splitter import CharacterTextSplitter
from pydantic import BaseModel
from utils import json_utils
from utils.constants import (ENVIRONMENT, LLM_MAX_TOKENS, MAX_CONTEXTS,
                             NOT_ENOUGH_INFO_ANSWER)


def elapsed_time(func):
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        elapsed = end_time - start_time
        thread_name = threading.current_thread().name
        print(f"[{thread_name}] Elapsed time: {elapsed} seconds")
        return result
    return wrapper


def string_as_generator(string):
    yield string


class CiteSpan(BaseModel):
    start: int
    end: int
    text: str
    ref_id: Optional[str]


class TextBlock(BaseModel):
    text: str
    section: str
    sec_num: Union[int, None, str]
    cite_spans: List[CiteSpan]
    ref_spans: List[CiteSpan]


class FigRef(BaseModel):
    fig_num: Optional[str]
    text: str
    type_str: Literal["figure"]
    uris: Optional[List[str]]


class TabRef(BaseModel):
    text: str
    type_str: Literal["table"]
    content: Optional[str]
    num: Optional[int]


class PdfParse(BaseModel):
    body_text: List[TextBlock]
    back_matter: List[TextBlock]
    ref_entries: Dict[str, Union[FigRef, TabRef]]


class Location(BaseModel):
    settlement: Optional[str]
    country: Optional[str]


class Affiliation(BaseModel):
    laboratory: Optional[str]
    institution: Optional[str]
    location: Optional[Location]


class Author(BaseModel):
    first: str
    middle: List[str]
    last: str
    suffix: str
    affiliation: Optional[Affiliation]
    email: Optional[str]


class Paper(BaseModel):
    abstract: str
    title: str
    authors: Optional[List[Author]]
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

    def _get_ref_entries_in_text_blocks(self, sections: List[TextBlock]) -> Dict[str, FigRef]:
        ref_entries = {}
        for section in sections:
            for ref_span in section.ref_spans:
                ref_id = ref_span.ref_id
                if ref_id is None:
                    continue
                if ref_id in self.pdf_parse.ref_entries:
                    ref_entries[ref_id] = self.pdf_parse.ref_entries[ref_id]
        return ref_entries

    def filter_sections(self, mode: str, paper_sections_partially_matches: List[str]):
        print(
            f"Filtering paper sections to {mode} {paper_sections_partially_matches}")
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

        # If we're excluding, we want to inverse the filter
        if mode == "exclude":
            filtered_blocks = [
                block for block in new_paper.pdf_parse.body_text if block not in filtered_blocks]
            filtered_back_matters = [
                block for block in new_paper.pdf_parse.back_matter if block not in filtered_back_matters]

        if filtered_blocks == filtered_back_matters == []:
            print("Filtered was too harsh! Paper went blank! Returning original")
            return

        ref_entries = self._get_ref_entries_in_text_blocks(
            [*filtered_blocks, *filtered_back_matters])

        del self.pdf_parse

        filtered_paper = Paper(
            **self.dict(),
            pdf_parse=PdfParse(
                body_text=filtered_blocks,
                back_matter=filtered_back_matters,
                ref_entries=ref_entries
            )
        )

        self.__dict__.update(filtered_paper.__dict__)

    def format_authors(self) -> str:
        result = []
        for author in self.authors:
            author_s = f"{author.first} {author.last}"
            if 'affiliation' in author and 'institution' in author.affiliation:
                author_s += f", {author.affiliation.institution}"
            if 'affliation' in author and 'location' in author.affiliation and 'country' in author.affiliation.location:
                author_s += f", {author.affiliation.location.country}"

            result.append(author_s)

        return "\n".join(result)

    def to_text(self) -> str:
        sections = set()
        result = []

        result.append(f"# {self.title}")

        if self.authors:
            result.append(f"Authors: {self.format_authors()}")

        def encode_section_header(
            x): return "#" * (x.count(".") + 1) if x and x[-1] != "." else "-"

        for text_block in self.pdf_parse.body_text + self.pdf_parse.back_matter:
            section = f"{encode_section_header(str(text_block.sec_num))} {text_block.sec_num or ''} {text_block.section}"
            if section not in sections:
                result.append(f"{section}\n{text_block.text}")
                sections.add(section)
            else:
                result[-1] += f"\n{text_block.text}"

        figs_and_tables = []
        for key, ref in self.pdf_parse.ref_entries.items():
            if ref.type_str == "figure":
                fig_num = ref.fig_num if ref.fig_num else key.replace(
                    "FIGREF", "")
                if fig_num == "0":
                    fig_num = ""
                figs_and_tables.append(
                    f"Figure {fig_num} caption: \"{ref.text}\"")
            elif ref.type_str == "table":
                table_num = ref.num if ref.num else key.replace("TABREF", "")
                if table_num == "0":
                    table_num = ""
                figs_and_tables.append(
                    f"Table {table_num}: {ref.text}\n{html_table_to_markdown(ref.content)}")

        if figs_and_tables != []:
            result.append(f"#### Figures and Tables")
            result.extend(figs_and_tables)

        return '\n\n'.join(result)


def html_table_to_markdown(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table")
    headers = [th.get_text().strip() for th in table.find_all("th")]
    rows = []
    for tr in table.find_all("tr"):
        row = [td.get_text().strip() for td in tr.find_all("td")]
        if row:
            rows.append(row)
    md_table = ""
    md_table += "| " + " | ".join(headers) + " |\n" if headers != [] else ""
    md_table += "| " + \
        " | ".join(["---" for _ in headers]) + " |\n" if headers != [] else ""
    for index, row in enumerate(rows):
        md_table += "| " + " | ".join(row) + " |\n"

        if headers == [] and index == 0:
            md_table += "| " + " | ".join(["---" for _ in row]) + " |\n"

    return md_table


def count_tokens(text) -> int:
    if text is None:
        return 0
    enc = tiktoken.encoding_for_model("gpt-3.5-turbo-0301")
    result = int(len(enc.encode(text, disallowed_special=()))
                 * 1.05)  # Add 5% for safety
    return result


def decode(tokens) -> str:
    enc = tiktoken.encoding_for_model("gpt-3.5-turbo-0301")
    return enc.decode(tokens)


def split_text(text, chunk_size=3500, separator="\n"):
    text_splitter = CharacterTextSplitter.from_tiktoken_encoder(
        chunk_size=chunk_size, chunk_overlap=20, separator=separator)
    texts = text_splitter.split_text(text)
    return texts


def ask_json(text, completion_tokens=None) -> dict:
    num_attempts = 3
    message_history = []
    last_exception = None
    for i, _ in enumerate(range(num_attempts)):
        text += "\n---\nYour answer must be only a valid JSON object. No other text is allowed, before or after the JSON object. Use double quotes to wrap key and value strings."
        response = next(ask_text(text, completion_tokens, message_history))
        try:
            response = json_utils.correct_json(response)
            return json.loads(response)
        except json.decoder.JSONDecodeError as e:
            try:
                response = response[response.find("{"):response.rfind("}") + 1]
                return json.loads(response)
            except json.decoder.JSONDecodeError as e:
                last_exception = e
                message_history.append(OpenAIMessage(
                    role="assistant", content=response))
                message_history.append(OpenAIMessage(
                    role="user", content=f"Not a Valid JSON Object. Error: \"{e}\""))
                print(
                    f"Attempt {i} failed: Response is not a valid JSON object")
                print(f"Response: \n{response}")

    raise last_exception


class OpenAIMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

    def as_openai_message(self):
        return self


class ChatMessage(BaseModel):  # this should in sync with frontend
    text: str
    sender: Literal["user", "llm"]

    def as_openai_message(self) -> OpenAIMessage:
        sender = "assistant" if self.sender == "llm" else "user"
        return OpenAIMessage(role=sender, content=self.text)


def ask_text_stream_buffered(text, completion_tokens=None, message_history: List[ChatMessage] = [], stream=True) -> Generator[str, None, None]:
    token_queue = Queue()  # Queue for storing tokens

    # Create generator from ask_text function
    token_gen = ask_text(text, completion_tokens, message_history, stream)

    for token in token_gen:
        token_queue.put(token)  # Add token to queue

        if token_queue.qsize() >= 5:  # If queue has 5 or more elements
            grouped_tokens = ""
            for _ in range(5):  # Group five tokens
                grouped_tokens += token_queue.get()
            yield grouped_tokens  # Yield grouped tokens

    # Group and yield remaining items in the queue (if any)
    grouped_tokens = ""
    while not token_queue.empty():
        grouped_tokens += token_queue.get()
    if grouped_tokens:
        yield grouped_tokens


@elapsed_time
def ask_text(text, completion_tokens=None, message_history: List[ChatMessage] = [], stream=False) -> Generator[str, None, None]:
    text_size = count_tokens(text)
    history_size = sum([count_tokens(message.as_openai_message().content) +
                       3 for message in message_history])

    if completion_tokens is None:
        completion_tokens = LLM_MAX_TOKENS - text_size - history_size

    retries_remaining = 3
    while retries_remaining > 0:
        try:
            response = openai.ChatCompletion.create(
                max_tokens=int(completion_tokens),
                model="gpt-3.5-turbo-16k",
                messages=[
                    *[dict(message.as_openai_message()) for message in message_history]
                    {"role": "user", "content": text},
                ],
                stream=stream,
            )
            if stream:
                for chunk in response:
                    if chunk.choices[0].finish_reason == "stop":
                        return
                    if 'content' in chunk.choices[0].delta:
                        yield chunk.choices[0].delta.content
            else:
                yield response.choices[0].message.content

        except Exception as e:
            print("Error: " + str(e))
            retries_remaining -= 1
            if retries_remaining == 0:
                raise e
            else:
                print("Retrying...")

    return response


def get_top_k_labels(k, text, labels):
    if len(labels) < k:
        print(f"Already has less than {k} labels, skipping")
        return labels

    print(f"Getting top {k} labels")
    # Fetch it from LLMs since multi-class
    start = time.time()
    result = next(ask_json(f"""
        Give me a shortened list of the most relevant labels for the following text. 
        Text: {text}
        labels: {str(labels)}
        The answer must be a valid JSON array of strings, e.g. ["Introduction", "Related Work"]
        The answer must be contain at most {k} labels.
        """))
    end = time.time()
    print("Result: " + result)
    print("Time taken to top k labels: " + str(end - start) + " seconds")
    try:
        return json.loads(result)
    except json.JSONDecodeError as e:
        print("Failed to parse result as JSON, returning all labels")
        return labels


def validate_message_history(message_history: List[ChatMessage]):
    history_size = sum([count_tokens(message.text)
                        for message in message_history])

    message_token_limit = 400
    while history_size > LLM_MAX_TOKENS / 2:
        print("History too long, truncating")
        message_history = [ChatMessage(text=split_text(message.text, message_token_limit)[0], sender=message.sender) for message in message_history]
        history_size = sum([count_tokens(message.text)
                           for message in message_history])
        message_token_limit = int(message_token_limit * 0.85)

    print(f"History size: {history_size}")
    return message_history


def ask_context(question: str, full_context: str, message_history: List[ChatMessage] = [], prompt_override: Union[str, None] = None) -> Generator[str, None, None]:
    def build_prompt(question, context):
        if prompt_override is None:
            return f"""
            You are a smart and helpful assistant that specializes in answering user's questions/requests. For that you may use a given (partial) context.
            Any question must be answered based only on the given context. The context might come as raw text or markdown.
            Take into account the following rules:
            - Your answer must only contain information that is present in the context.
            - When the context does not contain enough information to answer the question, you must say so.
            - Your answer must be as detailed as possible 
            - Your answer must be in markdown format

            The presented context has been split, which means you're only seeing a part of it. You must nevertheless 
            answer the question based on the context you're given.

            Context:
            {context}
            
            Users's question/request to you: 
            {question}

            Your Answer:
            """
        else:
            if "{context}" not in prompt_override or "{question}" not in prompt_override:
                raise ValueError(
                    "Prompt override must contain {context} and {question}")

            return prompt_override.replace("{context}", context).replace("{question}", question)

    def build_summary_prompt(responses, question):
        return f"""
                You now are a smart assistant specializes in the merging responses task.
                You will receive a user request and a list of responses, and your job is to merge them into one single response,
                
                You must obey the following rules:

                - Do not include any responses that are not clearly related to the user's request.
                - You should not contradict yourself.
                - You should not repeat yourself.
                - Your answer must be sequential (i.e 'Response N+1' contents come after 'Response N').
                - You must mimic the structure & style of the original responses. (e.g. formal, informal, markdown table, code, json, etc.)
                - The answer must be directed to the user, not to the original responses.
                - The user only cares & knows about your given answer, not the original responses.
                - The user must not know from the answer that it is a merge of multiple responses.
                - You should not include any information that is not in the original responses (this is very important).

                
                These responses were generated by someone who only had access to a subset of all information, so they might contradicting.
                If that's the case, assume the answer that positively answers the user's request is correct.

                Responses to Merge:
                {responses}

                User Request:
                {question}

                Assistant Merged Response:
                """


    completion_tokens = 700
    context_max_tokens = LLM_MAX_TOKENS - completion_tokens - \
        count_tokens(build_prompt(context="", question=question))

    message_history = validate_message_history(message_history)
    history_size = sum([count_tokens(message.text)
                       for message in message_history])

    while True:
        contexts = split_text(full_context, context_max_tokens)
        print(f"context_max_tokens: {context_max_tokens}")

        context_sizes = [count_tokens(context) for context in contexts]
        print("Context sizes: ", context_sizes)

        sequence_sizes = [count_tokens(build_prompt(
            question, context)) + history_size + completion_tokens for context in contexts]
        print("Sequence sizes: ", sequence_sizes)

        if max(sequence_sizes) > LLM_MAX_TOKENS:
            print("Sequences too big! Shortening..")
            completion_tokens -= 60
            context_max_tokens -= 200
        else:
            if ENVIRONMENT == "dev":
                with open("full_context.txt", "w") as f:
                    f.write(full_context)
                with open("contexts.txt", "w") as f:
                    f.write("\n".join(["\nContext nr " + str(i) + ": " +
                            context + '\n' for i, context in enumerate(contexts)]))
            break

    print("Contexts to ask: ", len(contexts))
    if len(contexts) == 1:
        return ask_text_stream_buffered(
            text=build_prompt(question, contexts[0]),
            completion_tokens=completion_tokens,
            message_history=message_history,
            stream=True
        )

    def ask_chunk(chunk):
        return next(ask_text(
            text=build_prompt(question, chunk),
            completion_tokens=completion_tokens,
            message_history=message_history,
            stream=False
        ))

    futures = []
    with concurrent.futures.ThreadPoolExecutor() as executor:
        for full_context in contexts[:MAX_CONTEXTS]:
            futures.append(executor.submit(ask_chunk, chunk=full_context))

    responses = [f.result() for f in futures]

    if ENVIRONMENT == "dev":
        with open("responses.txt", "w") as f:
            f.write("\n\n".join(responses))

    print("Question: ", question)
    return ask_text_stream_buffered(build_summary_prompt(responses=responses, question=question), message_history=message_history, stream=True)


def ask_paper(question: str, paper: Paper, message_history: List[ChatMessage] = []) -> Generator[str, None, None]:
    if "this is a load test" in question.lower():
        return string_as_generator("This is a load test response")

    print("Asking paper")
    context = paper.to_text()

    prompt_override = """
    Answer the following question based on the given paper context, according to the following rules:

    - Do not include any information that is not in the paper.
    - If the paper context does not contain enough information to clearly answer the question, you must say so.
    - You cannot use any information that is not in the paper context.
    - Backup your answer with quotes from the paper.
    
    Paper Context:
    {context}

    Question:
    {question}    

    Answer:
    """

    return ask_context(
        question=question,
        full_context=context,
        message_history=message_history,
        prompt_override=prompt_override
    )
