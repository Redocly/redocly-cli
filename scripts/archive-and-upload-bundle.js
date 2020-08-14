const yargs = require('yargs');

const { execSync } = require('child_process');
const package = require('../package.json');

const version = package.version;
const fileName = `openapi-cli.${version}.tar.gz`;
const fileNameLatest = `openapi-cli.latest.tar.gz`;

execSync(`tar -zcvf ${fileName} dist`);
execSync(`tar -zcvf ${fileNameLatest} dist`);


const argv = yargs
    .option('aws-profile', {
        alias: 'p',
        type: 'string',
    })
    .argv;

let profile = !!argv.awsProfile ? `--profile ${argv.awsProfile}` : '';

try {
    execSync(`aws s3 cp ${fileName} s3://openapi-cli-dist ${profile}`);
    execSync(`aws s3 cp ${fileNameLatest} s3://openapi-cli-dist ${profile}`);
} catch (e) {
    process.stderr.write(e.output);
}

