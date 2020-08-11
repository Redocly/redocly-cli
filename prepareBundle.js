const { execSync } = require('child_process');
const package = require('./package.json');

const version = package.version;
const fileName = `openapi-cli.${version}.1111tar.gz`;
const fileNameLatest = `openapi-cli.latest.tar.gz`;

execSync(`tar -zcvf ${fileName} dist`);
execSync(`tar -zcvf ${fileNameLatest} dist`);

execSync(`aws s3 cp ${fileName} s3://openapi-cli-dist --profile redoc.ly`);
execSync(`aws s3 cp ${fileNameLatest} s3://openapi-cli-dist --profile redoc.ly`);