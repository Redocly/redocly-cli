#!/bin/bash

# Start server
docker build -t jsonserver .
docker run -p 3000:3000 --name test-server -d jsonserver

# Run API tests
pnpm run build:internal
pnpm run jest-e2e
CODE=$?

# Stop server
docker stop test-server
docker rm test-server

echo Exited with code $CODE.
exit $CODE
