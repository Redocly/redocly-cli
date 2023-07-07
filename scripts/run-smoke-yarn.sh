#!/bin/bash


cd ../__tmp__
rm -rf node_modules package-lock.json yarn.lock .yarn

echo "Yarn version:"
yarn --version
echo

echo "Directory content:"
ls -a
echo

yarn install

yarn add ./redocly-cli-yarn.tgz

yarn l
yarn b
yarn d

