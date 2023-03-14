#!/bin/zsh

BLUE='\033[0;34m'
GREEN='\033[0;32m'
NOCOLOR='\033[0m'

set -e

# Pathname of the current Working Directory (PWD) points to `ask-paper/infrastructure`
echo $PWD
echo "${GREEN}Started building $ENVIRONMENT backend zip 🧹${NOCOLOR}"
echo "${BLUE}Cleaning up... 🧹${NOCOLOR}"
rm -rf ../backend/src_dependencies && rm -rf build.zip

echo "${BLUE}Building dependencies... 📦${NOCOLOR}"
# it uses docker so dependencies are build from a linux image, resembling lambda real environment
docker run -v "$PWD/../backend":/var/task "lambci/lambda:build-python3.8" \
/bin/sh -c "pip install -r requirements.txt -t src_dependencies/; exit"

cd ../backend/src_dependencies
zip -r ../../infrastructure/build.zip .
cd -

echo "${BLUE}Adding source code... 🌊${NOCOLOR}"
cd ../backend/src
zip -r ../../infrastructure/build.zip -u .
cd -

echo "${GREEN}Done ✅${NOCOLOR}"
