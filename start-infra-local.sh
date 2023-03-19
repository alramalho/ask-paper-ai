#!/bin/zsh


BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;93m'
NOCOLOR='\033[0m'

set -e

build=true
for arg in "$@"; do
  if [[ "$arg" == "--no-build" ]]; then
    build=false
    break
  fi
done

export ENVIRONMENT=dev

echo "${GREEN}Setting env vars 🧹${NOCOLOR}"
touch ./infrastructure/.env
export "$(cat './infrastructure/.env' | xargs)"

pushd infrastructure
yarn

if $build; then
    echo "${GREEN}Building backend 🧹${NOCOLOR}"
    yarn build-backend-zip
else
    echo "${BLUE}Skipping backend build ⏩${NOCOLOR}"
fi

echo "${GREEN}Deploying backend to local infrastructure 🧹${NOCOLOR}"
yarn deploy-local

echo "${GREEN}Starting docker containers ⬆️${NOCOLOR}"
docker compose up localstack