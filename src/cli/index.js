#!/usr/bin/env node

import chalk from 'chalk';
import program from 'commander';
import fs from 'fs';
import {
  join, basename, dirname, extname,
} from 'path';

import { validateFromFile, validateFromUrl } from '../validate';
import { bundleToFile } from '../bundle';

import { isFullyQualifiedUrl } from '../utils';

import { outputMessages, printValidationHeader } from './outputMessages';

const validateFile = (filePath, options, cmdObj) => {
  let result;

  if (!fs.existsSync(filePath) && isFullyQualifiedUrl(filePath)) {
    process.stdout.write('Will validate from URL\n');
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
    .command('bundle <entryPoints...>')
    .description('Create a bundle using <entryPoint> as a root document.')
    .option('-o, --output <outputName>', 'Filename or folder for the bundle.')
    .option('--short', 'Reduce output in case of bundling errors.')
    .option('--ext <ext>', 'Output extension: json, yaml or yml')
    .action((entryPoints, cmdObj) => {
      if (cmdObj.ext && ['yaml', 'yml', 'json'].indexOf(cmdObj.ext) === -1) {
        process.stdout.write(
          'Unsupported value for --ext option. Supported values are: yaml, yml or json',
        );
        process.exit(1);
      }

      const isOutputDir = cmdObj.output && !extname(cmdObj.output);
      const ext = cmdObj.ext || extname(cmdObj.output || '').substring(1) || 'yaml';
      const dir = isOutputDir ? cmdObj.output : dirname(cmdObj.output);

      const results = {
        errors: 0,
        warnings: 0,
      };

      entryPoints.forEach((entryPoint) => {
        const fileName = isOutputDir
          ? basename(entryPoint, extname(entryPoint))
          : basename(cmdObj.output, `.${ext}`);
        const output = join(dir, `${fileName}.${ext}`);

        const bundlingStatus = bundleToFile(entryPoint, output);
        const resultStats = outputMessages(bundlingStatus, cmdObj);

        if (resultStats.totalErrors === 0) {
          // we do not want to output anything to stdout if it's being piped.
          if (output) {
            process.stdout.write(`Created a bundle for ${entryPoint} at ${output}.\n`);
          }
        } else {
          process.stdout.write(`Errors encountered while bundling ${entryPoint}.\n`);
          results.errors += resultStats.totalErrors;
          results.warnings += resultStats.totalWarnings;
        }
      });
      process.exit(results.errors > 0 ? 1 : 0);
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
