#!/bin/zsh


BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;93m'
NOCOLOR='\033[0m'

set -e

build=false
for arg in "$@"; do
  if [[ "$arg" == "--build" ]]; then
    build=true
    break
  fi
done

export ENVIRONMENT=dev

echo "${GREEN}Setting env vars 🧹${NOCOLOR}"
touch ./infrastructure/.env
export "$(cat './infrastructure/.env' | xargs)"

pushd infrastructure
yarn

echo "${GREEN}Starting local AWS ⬆️${NOCOLOR}"
docker compose up localstack -d

if $build; then
    echo "${GREEN}Building backend 🧹${NOCOLOR}"
    yarn build-backend-zip
else
    echo "${BLUE}Skipping backend build ⏩${NOCOLOR}"
fi

echo "${GREEN}Deploying backend to local infrastructure 🧹${NOCOLOR}"
yarn deploy-local

docker logs -f localstack

