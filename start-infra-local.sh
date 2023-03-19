#!/bin/zsh


BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;93m'
NOCOLOR='\033[0m'

set -e

export ENVIRONMENT=dev

echo "${GREEN}Setting env vars 🧹${NOCOLOR}"
touch ./infrastructure/.env
export "$(cat './infrastructure/.env' | xargs)"

echo "${GREEN}Starting docker containers ⬆️${NOCOLOR}"
docker compose up localstack