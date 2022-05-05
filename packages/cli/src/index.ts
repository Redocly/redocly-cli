#!/usr/bin/env node

import './assert-node-version';
import * as yargs from 'yargs';
import { outputExtensions, regionChoices } from './types';
import { RedoclyClient, OutputFormat } from '@redocly/openapi-core';
import { previewDocs } from './commands/preview-docs';
import { handleStats } from './commands/stats';
import { handleSplit } from './commands/split';
import { handleJoin } from './commands/join';
import { handlePush, transformPush } from './commands/push';
import { handleLint } from './commands/lint';
import { handleBundle } from './commands/bundle';
import { handleLogin } from './commands/login';
const version = require('../package.json').version;

yargs
  .version('version', 'Show version number.', version)
  .help('help', 'Show help.')
  .command(
    'stats [entrypoint]',
    'Gathering statistics for a document.',
    (yargs) =>
      yargs.positional('entrypoint', { type: 'string' }).option({
        config: { description: 'Specify path to the config file.', type: 'string' },
        format: {
          description: 'Use a specific output format.',
          choices: ['stylish', 'json'] as ReadonlyArray<OutputFormat>,
          default: 'stylish' as OutputFormat,
        },
      }),
    handleStats,
  )
  .command(
    'split [entrypoint]',
    'Split definition into a multi-file structure.',
    (yargs) =>
      yargs
        .positional('entrypoint', {
          description: 'API definition file that you want to split',
          type: 'string',
        })
        .option({
          outDir: {
            description: 'Output directory where files will be saved.',
            required: true,
            type: 'string',
          },
          separator: {
            description: 'File path separator used while splitting.',
            required: false,
            type: 'string',
            default: '_',
          },
        })
        .demandOption('entrypoint'),
    handleSplit,
  )
  .command(
    'join [entrypoints...]',
    'Join definitions [experimental].',
    (yargs) =>
      yargs
        .positional('entrypoints', {
          array: true,
          type: 'string',
          demandOption: true,
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
            default: false,
          },
          'prefix-components-with-info-prop': {
            description: 'Prefix components with property value from info object.',
            requiresArg: true,
            type: 'string',
          },
        }),
    (argv) => {
      handleJoin(argv, version);
    },
  )
  .command(
    'push [maybeEntrypointOrAliasOrDestination] [maybeDestination] [maybeBranchName]',
    'Push an API definition to the Redocly API registry.',
    (yargs) =>
      yargs
        .positional('maybeEntrypointOrAliasOrDestination', { type: 'string' })
        .positional('maybeDestination', { type: 'string' })
        .positional('maybeBranchName', { type: 'string' })
        .option({
          branch: { type: 'string', alias: 'b' },
          upsert: { type: 'boolean', alias: 'u' },
          'run-id': { type: 'string', requiresArg: true },
          region: { description: 'Specify a region.', alias: 'r', choices: regionChoices },
          'skip-decorator': {
            description: 'Ignore certain decorators.',
            array: true,
            type: 'string',
          },
        }),
    transformPush(handlePush),
  )
  .command(
    'lint [entrypoints...]',
    'Lint definition.',
    (yargs) =>
      yargs.positional('entrypoints', { array: true, type: 'string', demandOption: true }).option({
        format: {
          description: 'Use a specific output format.',
          choices: [
            'stylish',
            'codeframe',
            'json',
            'checkstyle',
            'codeclimate',
          ] as ReadonlyArray<OutputFormat>,
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
        },
      }),
    (argv) => {
      handleLint(argv, version);
    },
  )
  .command(
    'bundle [entrypoints...]',
    'Bundle definition.',
    (yargs) =>
      yargs.positional('entrypoints', { array: true, type: 'string', demandOption: true }).options({
        output: { type: 'string', alias: 'o' },
        format: {
          description: 'Use a specific output format.',
          choices: ['stylish', 'codeframe', 'json', 'checkstyle'] as ReadonlyArray<OutputFormat>,
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
        metafile: {
          description: 'Produce metadata about the bundle',
          type: 'string',
        },
        extends: {
          description: 'Override extends configurations (defaults or config file settings).',
          requiresArg: true,
          array: true,
          type: 'string',
        },
        'remove-unused-components': {
          description: 'Remove unused components.',
          type: 'boolean',
          default: false,
        },
      }),
    (argv) => {
      handleBundle(argv, version);
    },
  )
  .command(
    'login',
    'Login to the Redocly API registry with an access token.',
    async (yargs) =>
      yargs.options({
        verbose: {
          description: 'Include additional output.',
          type: 'boolean',
        },
        region: {
          description: 'Specify a region.',
          alias: 'r',
          choices: regionChoices,
        },
      }),
    handleLogin,
  )
  .command(
    'logout',
    'Clear your stored credentials for the Redocly API registry.',
    (yargs) => yargs,
    async () => {
      const client = new RedoclyClient();
      client.logout();
    },
  )
  .command(
    'preview-docs [entrypoint]',
    'Preview API reference docs for the specified definition.',
    (yargs) =>
      yargs.positional('entrypoint', { type: 'string' }).options({
        port: {
          alias: 'p',
          type: 'number',
          default: 8080,
          description: 'Preview port.',
        },
        host: {
          alias: 'h',
          type: 'string',
          default: '127.0.0.1',
          description: 'Preview host.',
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
        force: {
          alias: 'f',
          type: 'boolean',
          description: 'Produce bundle output even when errors occur.',
        },
        config: {
          description: 'Specify path to the config file.',
          type: 'string',
        },
      }),
    previewDocs,
  )
  .completion('completion', 'Generate completion script.')
  .demandCommand(1)
  .strict().argv;
