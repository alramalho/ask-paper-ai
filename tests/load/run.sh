#!/bin/zsh

GREEN='\033[0;32m'
NOCOLOR='\033[0m'

set -e
TEST_EMAIL=$(uuidgen)@load.test
export TEST_EMAIL=$TEST_EMAIL

echo "${GREEN}🏃‍Running load tests...${NOCOLOR}"
artillery run --output report.json artillery.yaml

echo "${GREEN}🧹 Cleaning up${NOCOLOR}"
python3 cleanup.py

echo "${GREEN}✅ Done${NOCOLOR}"