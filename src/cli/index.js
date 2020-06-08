#!/usr/bin/env node

import chalk from 'chalk';
import commander from 'commander';

import fs from 'fs';
import {
  join, basename, dirname, extname,
} from 'path';
import * as chockidar from 'chokidar';
import * as glob from 'glob';

import RedoclyClient from '../redocly';
import { promptUser } from './utils';
import { validateFromFile, validateFromUrl } from '../validate';
import { bundle, bundleToFile } from '../bundle';

import { isFullyQualifiedUrl, debounce } from '../utils';

import { outputMessages, printValidationHeader } from './outputMessages';
import { getFallbackEntryPointsOrExit, getConfig } from '../config';

import startPreviewServer from '../preview-docs';

const program = new commander.Command();

const validateFile = async (filePath, options, cmdObj) => {
  let result;

  if (!fs.existsSync(filePath) && isFullyQualifiedUrl(filePath)) {
    process.stdout.write('Will validate from URL\n');
    result = await validateFromUrl(filePath, options);
  } else {
    result = await validateFromFile(filePath, options);
  }
  const resultStats = outputMessages(result, cmdObj);

  const { totalErrors, totalWarnings } = resultStats;
  process.stdout.write(
    `${chalk.blueBright(filePath)} results. Errors: ${totalErrors}, warnings: ${totalWarnings}\n`,
  );

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
    .command('registry:login')
    .description('Login to the Redoc.ly API Registry with access token')
    .option('-p, --prompt', 'Ask for credentials instead of looking them in the .env or enviroment variables')
    .action(async () => {
      const clientToken = await promptUser(
        chalk.green(`\n  🔑 Copy your access token from ${chalk.blue(`https://app.${process.env.REDOCLY_DOMAIN || 'redoc.ly'}/profile`)} and paste it below`),
      );
      const client = new RedoclyClient();
      client.login(clientToken);
    });

  program
    .command('registry:logout')
    .description('Clear stored credentials for Redoc.ly API Registry')
    .action(async () => {
      const client = new RedoclyClient();
      client.logout();
    });

  program
    .command('bundle [entryPoints...]')
    .description('Create a bundle using <entryPoint> as a root document.')
    .option('-o, --output <outputName>', 'Filename or folder for the bundle.')
    .option('--short', 'Reduce output in case of bundling errors.')
    .option('--ext <ext>', 'Output extension: json, yaml or yml')
    .option('-f, --force', 'Produce bundle output file even if validation errors were encountered')
    .action(async (entryPoints, cmdObj) => {
      if (cmdObj.ext && ['yaml', 'yml', 'json'].indexOf(cmdObj.ext) === -1) {
        process.stdout.write(
          'Unsupported value for --ext option. Supported values are: yaml, yml or json',
        );
        process.exit(1);
      }

      const config = getConfig({});
      // eslint-disable-next-line no-param-reassign
      entryPoints = getFallbackEntryPointsOrExit(entryPoints, config);

      const isOutputDir = cmdObj.output && !extname(cmdObj.output);
      const ext = cmdObj.ext || extname(cmdObj.output || '').substring(1) || 'yaml';
      const dir = isOutputDir ? cmdObj.output : dirname(cmdObj.output || '');

      const results = {
        errors: 0,
        warnings: 0,
      };

      for (const entryPoint of entryPoints) {
        let output;
        if (cmdObj.output) {
          const fileName = isOutputDir
            ? basename(entryPoint, extname(entryPoint))
            : basename(cmdObj.output, `.${ext}`);
          output = join(dir, `${fileName}.${ext}`);
        }

        const bundlingStatus = await bundleToFile(entryPoint, output, cmdObj.force);
        const resultStats = outputMessages(bundlingStatus, cmdObj);

        if (resultStats.totalErrors === 0) {
          // we do not want to output anything to stdout if it's being piped.
          if (output) {
            process.stdout.write(`Created a bundle for ${entryPoint} at ${output}\n`);
          }
        } else {
          if (cmdObj.force) {
            process.stderr.write(
              `Created a bundle for ${entryPoint} at ${output}. Errors ignored because of --force\n`,
            );
          } else {
            process.stderr.write(
              `Errors encountered while bundling ${entryPoint}: bundle not created (use --force to ignore errors)\n`,
            );
          }
          results.errors += resultStats.totalErrors;
          results.warnings += resultStats.totalWarnings;
        }
      }
      process.exit(results.errors === 0 || cmdObj.force ? 0 : 1);
    });

  program
    .command('validate [entryPoints...]')
    .description('Validate given OpenAPI 3 definition file(s).')
    .option('--short', 'Reduce output to required minimun.')
    .option('--no-frame', 'Print no codeframes with errors.')
    .option('--config <path>', 'Specify custom yaml or json config')
    .action(async (entryPoints, cmdObj) => {
      const options = {};
      const results = {
        errors: 0,
        warnings: 0,
      };

      const config = getConfig({});
      // eslint-disable-next-line no-param-reassign
      entryPoints = getFallbackEntryPointsOrExit(entryPoints, config);

      options.codeframes = cmdObj.frame;
      if (cmdObj.config) options.configPath = cmdObj.config;

      for (const entryPoint of entryPoints) {
        const globMatches = glob.sync(entryPoint);

        for (const globMatch of globMatches) {
          printValidationHeader(globMatch);

          const msgs = await validateFile(globMatch, options, cmdObj);
          results.errors += msgs.errors;
          results.warnings += msgs.warnings;
        }
      }
      if (entryPoints.length > 1) {
        process.stdout.write(`Validation results:\nerrors: ${results.errors}\nwarnings: ${results.warnings}\n`);
      }
      process.exit(results.errors > 0 ? 1 : 0);
    });

  function myParseInt(value) {
    return parseInt(value, 10);
  }

  program
    .command('preview-docs [entryPoint]')
    .description('Preview API Reference docs for the specified entrypoint OAS definition')
    .option('-p, --port <value>', 'Preview port', myParseInt, 8080)
    .option('--use-community-edition', 'Use Redoc CE for docs preview.')
    .action(async (entryPoint, cmdObj) => {
      const output = 'dist/openapi.yaml';

      let config = getConfig({});
      // eslint-disable-next-line no-param-reassign, prefer-destructuring
      entryPoint = getFallbackEntryPointsOrExit(entryPoint ? [entryPoint] : [], config)[0];

      let cachedBundle;
      const deps = new Set();

      async function getBundle() {
        return cachedBundle;
      }

      async function updateBundle() {
        process.stdout.write('\nBundling...\n\n');
        const { bundle: openapiBundle, result, fileDependencies } = await bundle(entryPoint, output, {
          lint: {
            codeframes: false,
          },
        });

        const removed = [...deps].filter((x) => !fileDependencies.has(x));
        watcher.unwatch(removed);
        watcher.add([...fileDependencies]);
        deps.clear();
        fileDependencies.forEach(deps.add, deps);

        const resultStats = outputMessages(result, { short: true });

        if (resultStats.totalErrors === 0) {
          process.stdout.write(
            resultStats.totalErrors === 0
              ? `Created a bundle for ${entryPoint} ${resultStats.totalWarnings > 0 ? 'with warnings' : 'successfully'}\n`
              : chalk.yellow(`Created a bundle for ${entryPoint} with errors. Docs may be broken or not accurate\n`),
          );
        }

        return openapiBundle;
      }

      const redoclyClient = new RedoclyClient();
      const isAuthorizedWithRedocly = await redoclyClient.isAuthorizedWithRedocly();

      setImmediate(() => {
        cachedBundle = updateBundle();
      }); // initial cache

      const referenceDocs = config.referenceDocs || {};

      const redocOptions = {
        ...referenceDocs,
        useCommunityEdition: cmdObj.useCommunityEdition || referenceDocs.useCommunityEdition,
        licenseKey: process.env.REDOCLY_LICENSE_KEY || referenceDocs.licenseKey,
      };

      const hotClients = await startPreviewServer(cmdObj.port, {
        getBundle,
        getOptions: () => redocOptions,
        useRedocPro: (isAuthorizedWithRedocly || redocOptions.licenseKey) && !redocOptions.useCommunityEdition,
      });

      const watcher = chockidar.watch([entryPoint, config.configPath], {
        disableGlobbing: true,
        ignoreInitial: true,
      });

      const debouncedUpdatedeBundle = debounce(async () => {
        cachedBundle = updateBundle();
        await cachedBundle;
        hotClients.broadcast('{"type": "reload", "bundle": true}');
      }, 2000);

      const changeHandler = async (type, file) => {
        process.stdout.write(`${chalk.green('watch')} ${type} ${chalk.blue(file)}\n`);
        if (file === config.configPath) {
          config = getConfig({ configPath: file });
          hotClients.broadcast(JSON.stringify({ type: 'reload' }));
          return;
        }

        debouncedUpdatedeBundle();
      };

      watcher.on('change', changeHandler.bind(undefined, 'changed'));
      watcher.on('add', changeHandler.bind(undefined, 'added'));
      watcher.on('unlink', changeHandler.bind(undefined, 'removed'));

      watcher.on('ready', () => {
        process.stdout.write(`\n  👀  Watching ${chalk.blue(entryPoint)} and all related resources for changes\n`);
      });
    });

  program.on('command:*', () => {
    process.stderr.write(`\nUnknown command ${program.args.join(' ')}\n\n`);
    program.outputHelp();
  });

  if (process.argv.length === 2) process.argv.push('-h');

  program.parse(process.argv);
};

export default cli;
