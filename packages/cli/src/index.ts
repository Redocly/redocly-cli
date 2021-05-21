#!/usr/bin/env node

import './assert-node-version';

import * as yargs from 'yargs';
import { green, blue } from 'colorette';
import { promptUser } from './utils';
import { outputExtensions } from './types';
import { RedoclyClient, OutputFormat } from "@redocly/openapi-core";
import { previewDocs } from './commands/preview-docs';
import { handleStats } from './commands/stats';
import { handleSplit } from './commands/split';
import { handleJoin } from './commands/join';
import { handlePush } from './commands/push';
import { handleLint } from './commands/lint';
import { handleBundle } from './commands/bundle';
const version = require('../package.json').version;

yargs
  .version('version', 'Show version number.', version)
  .help('help', 'Show help.')
  .command('stats [entrypoint]', 'Gathering statistics for a document.',
    (yargs) => yargs
      .positional('entrypoint', { type: 'string' })
      .option({
        config: { description: 'Specify path to the config file.', type: 'string' },
        format: {
          description: 'Use a specific output format.',
          choices: ['stylish', 'json'] as ReadonlyArray<OutputFormat>,
          default: 'stylish' as OutputFormat,
        }
      }),
    (argv) => { handleStats(argv) }
  )
  .command('split [entrypoint]', 'Split definition into a multi-file structure.',
    (yargs) => yargs
      .positional('entrypoint', { type: 'string' })
      .option({
        outDir: {
          description: 'Output directory where files will be saved.',
          required: true,
          type: 'string'
        }
      }),
    (argv) => { handleSplit(argv) }
  )
  .command('join [entrypoints...]', 'Join definitions [experimental].',
    (yargs) => yargs
      .positional('entrypoints', {
        array: true,
        type: 'string',
        demandOption: true
      })
      .option({
        lint: { description: 'Lint definitions', type: 'boolean', default: false },
        'prefix-tags-with-info-prop': {
          description: 'Prefix tags with property value from info object.',
          requiresArg: true,
          type: 'string',
        },
        'prefix-tags-with-filename': {
          description: 'Prefix tags with property value from file name.',
          type: 'boolean',
          default: false
        },
        'prefix-components-with-info-prop': {
          description: 'Prefix components with property value from info object.',
          requiresArg: true,
          type: 'string',
        }
      }),
    (argv) => { handleJoin(argv, version) }
  )
  .command('push <entrypoint> <destination> [branchName]', 'Push an API definition to the Redocly API registry.',
    (yargs) => yargs
    .positional('entrypoint', { type: 'string' })
    .positional('destination', { type: 'string' })
    .positional('branchName', { type: 'string' })
    .option({
      'upsert': { type: 'boolean', alias: 'u' },
      'run-id': { type: 'string', requiresArg: true }
    }),
    (argv) => { handlePush(argv) }
  )
  .command('lint [entrypoints...]', 'Lint definition.',
    (yargs) => yargs
      .positional('entrypoints', { array: true, type: 'string', demandOption: true })
      .option({
        format: {
          description: 'Use a specific output format.',
          choices: ['stylish', 'codeframe', 'json'] as ReadonlyArray<OutputFormat>,
          default: 'codeframe' as OutputFormat,
        },
        'max-problems': {
          requiresArg: true,
          description: 'Reduce output to max N problems.',
          type: 'number',
          default: 100,
        },
        'generate-ignore-file': {
          description: 'Generate ignore file.',
          type: 'boolean',
        },
        'skip-rule': {
          description: 'Ignore certain rules.',
          array: true,
          type: 'string',
        },
        'skip-preprocessor': {
          description: 'Ignore certain preprocessors.',
          array: true,
          type: 'string',
        },
        config: {
          description: 'Specify path to the config file.',
          requiresArg: true,
          type: 'string',
        },
        extends: {
          description: 'Override extends configurations (defaults or config file settings).',
          requiresArg: true,
          array: true,
          type: 'string',
        }
      }),
    (argv) => { handleLint(argv, version) }
  )
  .command('bundle [entrypoints...]', 'Bundle definition.',
    (yargs) => yargs
      .positional('entrypoints', { array: true, type: 'string', demandOption: true })
      .options({
        output: { type: 'string', alias: 'o' },
        format: {
          description: 'Use a specific output format.',
          choices: ['stylish', 'codeframe', 'json'] as ReadonlyArray<OutputFormat>,
          default: 'codeframe' as OutputFormat,
        },
        'max-problems': {
          requiresArg: true,
          description: 'Reduce output to max N problems.',
          type: 'number',
          default: 100,
        },
        ext: {
          description: 'Bundle file extension.',
          requiresArg: true,
          choices: outputExtensions,
        },
        'skip-rule': {
          description: 'Ignore certain rules.',
          array: true,
          type: 'string',
        },
        'skip-preprocessor': {
          description: 'Ignore certain preprocessors.',
          array: true,
          type: 'string',
        },
        'skip-decorator': {
          description: 'Ignore certain decorators.',
          array: true,
          type: 'string',
        },
        dereferenced: {
          alias: 'd',
          type: 'boolean',
          description: 'Produce fully dereferenced bundle.',
        },
        force: {
          alias: 'f',
          type: 'boolean',
          description: 'Produce bundle output even when errors occur.',
        },
        config: {
          description: 'Specify path to the config file.',
          type: 'string',
        },
        lint: {
          description: 'Lint definitions',
          type: 'boolean',
          default: false,
        },
      }),
    (argv) => { handleBundle(argv, version) }
  )
  .command('login', 'Login to the Redocly API registry with an access token.', async (yargs) =>
    yargs.options({
      verbose: {
        description: 'Include addtional output.',
        type: 'boolean',
      },
    }),
    async (argv) => {
      const clientToken = await promptUser(
        green(
          `\n  🔑 Copy your API key from ${blue(
            `https://app.${process.env.REDOCLY_DOMAIN || 'redoc.ly'}/profile`,
          )} and paste it below`,
        ),
        true,
      );
      const client = new RedoclyClient();
      client.login(clientToken, argv.verbose);
  })
  .command('logout', 'Clear your stored credentials for the Redocly API registry.', yargs => yargs, async () => {
    const client = new RedoclyClient();
    client.logout();
  })
  .command('preview-docs [entrypoint]', 'Preview API reference docs for the specified definition.',
    (yargs) => yargs
      .positional('entrypoint', { type: 'string' })
      .options({
        port: {
          alias: 'p',
          type: 'number',
          default: 8080,
          description: 'Preview port.'
        },
        'skip-preprocessor': {
          description: 'Ignore certain preprocessors.',
          array: true,
          type: 'string',
        },
        'skip-decorator': {
          description: 'Ignore certain decorators.',
          array: true,
          type: 'string',
        },
        'use-community-edition': {
          description: 'Force using Redoc CE for docs preview.',
          type: 'boolean',
        },
        'force': {
          alias: 'f',
          type: 'boolean',
          description: 'Produce bundle output even when errors occur.',
        },
        'config': {
          description: 'Specify path to the config file.',
          type: 'string',
        }
      }),
    async (argv) => { previewDocs(argv) },
  )
  .completion('completion', 'Generate completion script.')
  .demandCommand(1)
  .strict().argv;
