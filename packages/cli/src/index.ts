#!/usr/bin/env node

import './assert-node-version';
import * as yargs from 'yargs';
import { outputExtensions, regionChoices } from './types';
import { RedoclyClient, OutputFormat, RuleSeverity } from '@redocly/openapi-core';
import { previewDocs } from './commands/preview-docs';
import { handleStats } from './commands/stats';
import { handleSplit } from './commands/split';
import { handleJoin } from './commands/join';
import { handlePush, transformPush } from './commands/push';
import { handleLint } from './commands/lint';
import { handleBundle } from './commands/bundle';
import { handleLogin } from './commands/login';
import { handlerBuildCommand } from './commands/build-docs';
import type { BuildDocsArgv } from './commands/build-docs/types';
const version = require('../package.json').version;

yargs
  .version('version', 'Show version number.', version)
  .help('help', 'Show help.')
  .command(
    'stats [api]',
    'Gathering statistics for a document.',
    (yargs) =>
      yargs.positional('api', { type: 'string' }).option({
        config: { description: 'Specify path to the config file.', type: 'string' },
        format: {
          description: 'Use a specific output format.',
          choices: ['stylish', 'json'] as ReadonlyArray<OutputFormat>,
          default: 'stylish' as OutputFormat,
        },
      }),
    (argv) => {
      process.env.REDOCLY_CLI_COMMAND = 'stats';
      handleStats(argv);
    }
  )
  .command(
    'split [api]',
    'Split definition into a multi-file structure.',
    (yargs) =>
      yargs
        .positional('api', {
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
        .demandOption('api'),
    (argv) => {
      process.env.REDOCLY_CLI_COMMAND = 'split';
      handleSplit(argv);
    }
  )
  .command(
    'join [apis...]',
    'Join definitions [experimental].',
    (yargs) =>
      yargs
        .positional('apis', {
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
          'without-x-tag-groups': {
            description: 'Skip automated x-tagGroups creation',
            type: 'boolean',
          },
          output: {
            describe: 'Output file',
            alias: 'o',
            type: 'string',
            default: 'openapi.yaml',
          },
        }),
    (argv) => {
      process.env.REDOCLY_CLI_COMMAND = 'join';
      handleJoin(argv, version);
    }
  )
  .command(
    'push [maybeApiOrDestination] [maybeDestination] [maybeBranchName]',
    'Push an API definition to the Redocly API registry.',
    (yargs) =>
      yargs
        .positional('maybeApiOrDestination', { type: 'string' })
        .positional('maybeDestination', { type: 'string' })
        .positional('maybeBranchName', { type: 'string' })
        .option({
          branch: { type: 'string', alias: 'b' },
          upsert: { type: 'boolean', alias: 'u' },
          'batch-id': {
            description:
              'Specifies the ID of the CI job that the current push will be associated with.',
            type: 'string',
            requiresArg: true,
          },
          'batch-size': {
            description: 'Specifies the total number of CI jobs planned to be pushed.',
            type: 'number',
            requiresArg: true,
          },
          region: { description: 'Specify a region.', alias: 'r', choices: regionChoices },
          'skip-decorator': {
            description: 'Ignore certain decorators.',
            array: true,
            type: 'string',
          },
          public: {
            description: 'Make API registry available to the public',
            type: 'boolean',
          },
          files: {
            description: 'List of other folders and files to upload',
            array: true,
            type: 'string',
          },
        })
        .implies('batch-id', 'batch-size')
        .implies('batch-size', 'batch-id'),
    (argv) => {
      process.env.REDOCLY_CLI_COMMAND = 'push';
      transformPush(handlePush)(argv);
    }
  )
  .command(
    'lint [apis...]',
    'Lint definition.',
    (yargs) =>
      yargs.positional('apis', { array: true, type: 'string', demandOption: true }).option({
        format: {
          description: 'Use a specific output format.',
          choices: [
            'stylish',
            'codeframe',
            'json',
            'checkstyle',
            'codeclimate',
            'summary',
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
        'lint-config': {
          description: 'Apply severity for linting the config file.',
          choices: ['warn', 'error', 'off'] as ReadonlyArray<RuleSeverity>,
          default: 'warn' as RuleSeverity,
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
      process.env.REDOCLY_CLI_COMMAND = 'lint';
      handleLint(argv, version);
    }
  )
  .command(
    'bundle [apis...]',
    'Bundle definition.',
    (yargs) =>
      yargs.positional('apis', { array: true, type: 'string', demandOption: true }).options({
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
        'keep-url-references': {
          description: 'Keep absolute url references.',
          type: 'boolean',
          alias: 'k',
        },
      }),
    (argv) => {
      process.env.REDOCLY_CLI_COMMAND = 'bundle';
      handleBundle(argv, version);
    }
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
    (argv) => {
      process.env.REDOCLY_CLI_COMMAND = 'login';
      handleLogin(argv);
    }
  )
  .command(
    'logout',
    'Clear your stored credentials for the Redocly API registry.',
    (yargs) => yargs,
    async () => {
      process.env.REDOCLY_CLI_COMMAND = 'logout';
      const client = new RedoclyClient();
      client.logout();
      process.stdout.write('Logged out from the Redocly account. ✋\n');
    }
  )
  .command(
    'preview-docs [api]',
    'Preview API reference docs for the specified definition.',
    (yargs) =>
      yargs.positional('api', { type: 'string' }).options({
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
    (argv) => {
      process.env.REDOCLY_CLI_COMMAND = 'preview-docs';
      previewDocs(argv);
    }
  )
  .command(
    'build-docs [api]',
    'build definition into zero-dependency HTML-file',
    (yargs) =>
      yargs
        .positional('api', { type: 'string' })
        .options({
          o: {
            describe: 'Output file',
            alias: 'output',
            type: 'string',
            default: 'redoc-static.html',
          },
          title: {
            describe: 'Page Title',
            type: 'string',
          },
          disableGoogleFont: {
            describe: 'Disable Google Font',
            type: 'boolean',
            default: false,
          },
          cdn: {
            describe: 'Do not include Redoc source code into html page, use link to CDN instead',
            type: 'boolean',
            default: false,
          },
          t: {
            alias: 'template',
            describe: 'Path to handlebars page template, see https://git.io/vh8fP for the example',
            type: 'string',
          },
          templateOptions: {
            describe:
              'Additional options that you want pass to template. Use dot notation, e.g. templateOptions.metaDescription',
          },
          theme: {
            describe: 'Redoc theme.openapi, use dot notation, e.g. theme.openapi.nativeScrollbars',
          },
          config: {
            describe: 'Specify path to the config file.',
            type: 'string',
          },
        })
        .check((argv: any) => {
          if (argv.theme && !argv.theme?.openapi)
            throw Error('Invalid option: theme.openapi not set');
          return true;
        }),
    async (argv) => {
      process.env.REDOCLY_CLI_COMMAND = 'build-docs';
      handlerBuildCommand(argv as unknown as BuildDocsArgv);
    }
  )
  .completion('completion', 'Generate completion script.')
  .demandCommand(1)
  .strict().argv;
