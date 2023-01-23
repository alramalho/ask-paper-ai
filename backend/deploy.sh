#!/bin/zsh

GREEN="\033[1;32m"
NOCOLOR="\033[0m"

set -e # exit on error

echo $(aws ecr get-login-password --region eu-central-1) | docker login --password-stdin --username AWS 854257060653.dkr.ecr.eu-central-1.amazonaws.com/hippo-repository

docker context list | grep awshippoecs || (echo "No awshippoecs context found. " && exit 1)
docker context use default
echo "${GREEN}Building Image🔨${NOCOLOR}"
docker build -t backend_fastapi .
echo "${GREEN}Tagging Image🏷${NOCOLOR}"
docker tag backend_fastapi:latest 854257060653.dkr.ec34924r.eu-central-1.amazonaws.com/hippo-repository

echo "${GREEN}Pushing Image to ECR⬆️${NOCOLOR}"
docker push 854257060653.dkr.ecr.eu-central-1.amazonaws.com/hippo-repository

echo "${GREEN}Deploying 🔥️${NOCOLOR}"
aws configure set default.region eu-central-1 # workaround to https://github.com/docker/compose-cli/issues/1050
docker context use awshippoecs
docker compose -f aws-docker-compose.yml --project-name hippo-prototype-backend up
docker context use default