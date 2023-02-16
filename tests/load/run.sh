#!/bin/zsh

GREEN='\033[0;32m'
NOCOLOR='\033[0m'

set -e

TEST_ID=$(netlify env:get TEST_ID)
export TEST_ID=$TEST_ID

echo "${GREEN}🏃‍Running load tests...${NOCOLOR}"
artillery run --output report.json artillery.yaml

echo "${GREEN}🧹 Cleaning up${NOCOLOR}"
python3 cleanup.py

artillery report report.json

echo "${GREEN}✅ Done${NOCOLOR}"