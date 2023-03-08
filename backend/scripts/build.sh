#!/bin/zsh

BLUE='\033[0;34m'
GREEN='\033[0;32m'
NOCOLOR='\033[0m'

set -e

echo $PWD
echo "${GREEN}Started building $ENVIRONMENT backend zip 🧹${NOCOLOR}"
echo "${BLUE}Cleaning up... 🧹${NOCOLOR}"
rm -rf ../src_dependencies && rm -rf ../build.zip

echo "${BLUE}Building dependencies... 📦${NOCOLOR}"
# it uses docker so dependencies are build from a linux image, resembling lambda real environment
cd ..
docker run -v "$PWD":/var/task "lambci/lambda:build-python3.8" /bin/sh -c "pip install -r requirements.txt -t src_dependencies/; exit"
cd ./src_dependencies
zip ../build.zip -r .
cd ..

echo "${BLUE}Adding source code... 🌊${NOCOLOR}"
cd ./src
zip ../build.zip -u . -r

echo "${GREEN}Done ✅${NOCOLOR}"