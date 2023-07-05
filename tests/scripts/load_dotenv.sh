#!/bin/bash
export $( grep -vE "^(#.*|\s*)$" $1 )

line_count=$(grep -v "^#" $1 | wc -l)
GREEN='\033[0;32m'
NOCOLOR='\033[0m'
echo "${GREEN}✅ Loaded $1 with $line_count env vars. ${NOCOLOR}"