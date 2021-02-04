#!/bin/sh
# rm -rf "$PWD"/node_modules
docker run -v "$PWD":/usr/src/app -w /usr/src/app node:12-slim npm install

docker-compose up