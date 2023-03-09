FROM python:3.8-slim as python
WORKDIR /app

# download aws-cli
# download build-essential for tiktoken
RUN apt update && apt-get install awscli curl build-essential -y
# install rust for tiktoken
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y
# using profile
RUN bash -ic 'source "$HOME/.cargo/env"'

COPY requirements.txt requirements.txt
# using profile so we can use rust
RUN bash -ic 'pip install -r requirements.txt'
COPY . .

# sleep infinity for debug purpose
# CMD ["sleep", "infinity"]
CMD ["python", "src/api.py"]
