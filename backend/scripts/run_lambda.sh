#!/bin/bash

PATH=$PATH:$LAMBDA_TASK_ROOT/bin
PYTHONPATH=$LAMBDA_TASK_ROOT
exec python -m uvicorn api:app --port 8000