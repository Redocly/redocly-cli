const yargs = require('yargs');

const { execSync } = require('child_process');
const package = require('./package.json');

const version = package.version;
const fileName = `openapi-cli.${version}.tar.gz`;
const fileNameLatest = `openapi-cli.latest.tar.gz`;

execSync(`tar -zcvf ${fileName} dist`);
execSync(`tar -zcvf ${fileNameLatest} dist`);


const argv = yargs
    .option('aws_profile', {
        alias: 'p',
        type: 'string',
    })
    .argv;

let profile = !!argv.aws_profile ? `--profile ${argv.aws_profile}` : '';

execSync(`aws s3 cp ${fileName} s3://openapi-cli-dist ${profile}`);
execSync(`aws s3 cp ${fileNameLatest} s3://openapi-cli-dist ${profile}`);