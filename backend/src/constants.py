import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
LATEST_COMMIT_ID = os.getenv("LATEST_COMMIT_ID", 'local')
ENVIRONMENT = os.getenv("ENVIRONMENT", 'local')
S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME', None)
FILESYSTEM_BASE = os.getenv('FILESYSTEM_BASE', '.')
EMAIL_SENDER = 'alex@hippoai.dev'
MAX_CONTEXTS = 3
LLM_MAX_TOKENS = 4000