#!/usr/bin/env node

import chalk from 'chalk';
import program from 'commander';
import fs from 'fs';

import { validateFromFile, validateFromUrl } from '../validate';
import { bundle } from '../bundle';

import { isUrl } from '../utils';

import { outputMessages, printValidationHeader } from './outputMessages';

const validateFile = (filePath, options, cmdObj) => {
  let result;

  if (isUrl(filePath)) {
    result = validateFromUrl(filePath, options);
  } else {
    result = validateFromFile(filePath, options);
  }
  const resultStats = outputMessages(result, cmdObj);
  process.stdout.write(`${chalk.blueBright(filePath)} results. Errors: ${resultStats.totalErrors}, warnings: ${resultStats.totalWarnings}\n`);

  return {
    errors: resultStats.totalErrors,
    warnings: resultStats.totalWarnings,
  };
};

const cli = () => {
  const f = fs.readFileSync(`${__dirname}/../package.json`, 'utf-8');
  const { version } = JSON.parse(f);

  program
    .version(version, '-v, --version', 'Output current version of the OpenAPI CLI.');

  program
    .command('bundle <startingPoint>')
    .description('Create a bundle using <startingPoint> as a root document.')
    .option('-o, --output <outputName>', 'Filename for the bundle.')
    .option('--short', 'Reduce output in case of bundling errors.')
    .action((startingPoint, cmdObj) => {
      const bundlingStatus = bundle(startingPoint, cmdObj.output);
      if (bundlingStatus.length === 0) {
        // we do not want to output anything to stdout if it's being piped.
        if (cmdObj.output) {
          process.stdout.write(`Created a bundle for ${startingPoint} at ${cmdObj.output}.\n`);
        }
        process.exit(0);
      } else {
        process.stdout.write(`Errors encountered while bundling ${startingPoint}.\n`);
        outputMessages(bundlingStatus, cmdObj);
        process.exit(1);
      }
    });

  program
    .command('validate <filePaths...>')
    .description('Validate given Open API 3 definition file.')
    .option('--short', 'Reduce output to required minimun')
    .option('--no-frame', 'Print no codeframes with errors.')
    .option('--config <path>', 'Specify custom yaml or json config')
    .action((filePaths, cmdObj) => {
      const options = {};
      const results = {
        errors: 0,
        warnings: 0,
      };

      options.codeframes = cmdObj.frame;
      if (cmdObj.config) options.configPath = cmdObj.config;

      for (let i = 0; i < filePaths.length; i++) {
        printValidationHeader(filePaths[i]);

        const msgs = validateFile(filePaths[i], options, cmdObj);
        results.errors += msgs.errors;
        results.warnings += msgs.warnings;
      }
      if (filePaths.length > 1) {
        process.stdout.write(`Total results. Errors: ${results.errors}, warnings: ${results.warnings}\n`);
      }
      process.exit(results.errors > 0 ? 1 : 0);
    });

  if (process.argv.length === 2) process.argv.push('-h');

  program.parse(process.argv);
};

export default cli;
