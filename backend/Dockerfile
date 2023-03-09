FROM python:3.8-slim as python
WORKDIR /app

# download aws-cli
RUN apt update && apt-get install awscli -y

COPY requirements.txt requirements.txt

RUN pip3 install -r requirements.txt

COPY . .

# sleep infinity for debug purpose
# CMD ["sleep", "infinity"]
CMD ["python3", "src/api.py"]
