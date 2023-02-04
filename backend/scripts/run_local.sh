#!/bin/bash

set -e

if [ -d $HOME/grobid-0.6.2 ]; then
    echo "Grobid exists"
else
    echo "Grobid does not exist, installing..."
    wget https://github.com/kermitt2/grobid/archive/0.6.2.zip
    unzip 0.6.2.zip
    mv grobid-0.6.2 $HOME
    cd $HOME/grobid-0.6.2
    ./gradlew install
fi

echo "Running Grobid"
pushd $HOME/grobid-0.6.2
./gradlew run &
popd

uvicorn main:app --reload --port 8000 &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?