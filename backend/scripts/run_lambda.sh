#!/bin/bash

PATH=$PATH:$LAMBDA_TASK_ROOT/bin
PYTHONPATH=$LAMBDA_TASK_ROOT
exec python -m uvicorn api:app --port $PORT --workers 1