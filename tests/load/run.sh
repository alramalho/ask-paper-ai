#!/bin/zsh

BLUE='\033[0;34m'
GREEN='\033[0;32m'
NOCOLOR='\033[0m'

set -e

TEST_ID=$(netlify env:get TEST_ID)
export TEST_ID=$TEST_ID

echo "${BLUE}🧹 Cleaning up sandbox to be able to verify${NOCOLOR}"
python3 ../cleanup_sandbox.py

echo "${GREEN}🏃‍Running load tests...${NOCOLOR}"
artillery run --output report.json artillery.yaml

artillery report report.json

echo "${GREEN}✅ Done${NOCOLOR}"