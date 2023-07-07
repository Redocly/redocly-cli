#!/bin/bash


cd ../__tmp__
rm -rf node_modules package-lock.json yarn.lock .yarn redoc-static.html

echo "NPM version:"
npm -v
echo

echo "Directory content:"
ls -a
echo

npm i redocly-cli.tgz

npm run l
npm run b
npm run d

