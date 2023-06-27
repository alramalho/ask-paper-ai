#!/bin/bash

set -e

pushd src
uvicorn api:app --reload --port 8000 --workers 1
# hypercorn api:app --reload --bind 0.0.0.0:8000 --workers 1