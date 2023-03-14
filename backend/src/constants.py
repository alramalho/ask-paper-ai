import os
from dotenv import load_dotenv

load_dotenv()

# TODO find a way to sync these variables with the ones in:
# `infrastructure/src/utils/constants.ts`
PASCAL_CASE_PREFIX = "AskPaper"
CAMEL_CASE_PREFIX = "askPaper"
SNAKE_CASE_PREFIX = "ask_paper"
KEBAB_CASE_PREFIX = "ask-paper"

OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
LATEST_COMMIT_ID = os.getenv("LATEST_COMMIT_ID", 'local')
ENVIRONMENT = os.getenv("ENVIRONMENT", 'local')
# TODO: now it defaults to sandbox. Add localstack so we can really test it locally
S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME', f'{KEBAB_CASE_PREFIX}-papers-sandbox')
FILESYSTEM_BASE = os.getenv('FILESYSTEM_BASE', '.')
EMAIL_SENDER = 'alex@hippoai.dev'
MAX_CONTEXTS = 3
LLM_MAX_TOKENS = 4000