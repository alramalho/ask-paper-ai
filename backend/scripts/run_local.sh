#!/bin/bash

set -e

# uvicorn main:app --reload --port 8000 &
pushd src
hypercorn api:app --reload --bind 0.0.0.0:8000 