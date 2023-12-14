#!/usr/bin/env node

import './assert-node-version';
import * as yargs from 'yargs';
import { outputExtensions, regionChoices } from './types';
import { RedoclyClient } from '@redocly/openapi-core';
import { previewDocs } from './commands/preview-docs';
import { handleStats } from './commands/stats';
import { handleSplit } from './commands/split';
import { handleJoin } from './commands/join';
import { handlePush, transformPush } from './commands/push';
import { handleLint } from './commands/lint';
import { handleBundle } from './commands/bundle';
import { handleLogin } from './commands/login';
import { handlerBuildCommand } from './commands/build-docs';
import { cacheLatestVersion, notifyUpdateCliVersion } from './update-version-notifier';
import { commandWrapper } from './wrapper';
import { version } from './update-version-notifier';
import type { Arguments } from 'yargs';
import type { OutputFormat, RuleSeverity } from '@redocly/openapi-core';
import type { BuildDocsArgv } from './commands/build-docs/types';

if (!('replaceAll' in String.prototype)) {
  require('core-js/actual/string/replace-all');
}

cacheLatestVersion();

yargs
  .version('version', 'Show version number.', version)
  .help('help', 'Show help.')
  .parserConfiguration({ 'greedy-arrays': false, 'camel-case-expansion': false })
  .command(
    'stats [api]',
    'Show statistics for an API description.',
    (yargs) =>
      yargs.positional('api', { type: 'string' }).option({
        config: { description: 'Path to the config file.', type: 'string' },
        'lint-config': {
          description: 'Severity level for config file linting.',
          choices: ['warn', 'error', 'off'] as ReadonlyArray<RuleSeverity>,
          default: 'warn' as RuleSeverity,
        },
        format: {
          description: 'Use a specific output format.',
          choices: ['stylish', 'json'] as ReadonlyArray<OutputFormat>,
          default: 'stylish' as OutputFormat,
        },
      }),
    (argv) => {
      process.env.REDOCLY_CLI_COMMAND = 'stats';
      commandWrapper(handleStats)(argv);
    }
  )
  .command(
    'split [api]',
    'Split an API description into a multi-file structure.',
    (yargs) =>
      yargs
        .positional('api', {
          description: 'API description file that you want to split',
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
          config: {
            description: 'Path to the config file.',
            requiresArg: true,
            type: 'string',
          },
          'lint-config': {
            description: 'Severity level for config file linting.',
            choices: ['warn', 'error', 'off'] as ReadonlyArray<RuleSeverity>,
            default: 'warn' as RuleSeverity,
          },
        })
        .demandOption('api'),
    (argv) => {
      process.env.REDOCLY_CLI_COMMAND = 'split';
      commandWrapper(handleSplit)(argv);
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
          lint: { description: 'Lint definitions', type: 'boolean', default: false, hidden: true },
          decorate: { description: 'Run decorators', type: 'boolean', default: false },
          preprocess: { description: 'Run preprocessors', type: 'boolean', default: false },
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
          },
          config: {
            description: 'Path to the config file.',
            requiresArg: true,
            type: 'string',
          },
          'lint-config': {
            description: 'Severity level for config file linting.',
            choices: ['warn', 'error', 'off'] as ReadonlyArray<RuleSeverity>,
            default: 'warn' as RuleSeverity,
          },
        }),
    (argv) => {
      process.env.REDOCLY_CLI_COMMAND = 'join';
      commandWrapper(handleJoin)(argv);
    }
  )

  .command(
    'push [api] [maybeDestination] [maybeBranchName]',
    'Push an API description to the Redocly API registry.',
    (yargs) =>
      yargs
        .usage('push [api]')
        .positional('api', { type: 'string' })
        .positional('maybeDestination', { type: 'string' })
        .hide('maybeDestination')
        .hide('maybeBranchName')
        .option({
          organization: {
            description: 'Name of the organization to push to.',
            type: 'string',
            alias: 'o',
          },
          destination: {
            description: 'API name and version in the format `name@version`.',
            type: 'string',
            alias: 'd',
          },
          branch: {
            description: 'Branch name to push to.',
            type: 'string',
            alias: 'b',
          },
          upsert: {
            description:
              "Create the specified API version if it doesn't exist, update if it does exist.",
            type: 'boolean',
            alias: 'u',
          },
          'batch-id': {
            description:
              'Specifies the ID of the CI job that the current push will be associated with.',
            type: 'string',
            requiresArg: true,
            deprecated: true,
            hidden: true,
          },
          'job-id': {
            description: 'ID of the CI job that the current push will be associated with.',
            type: 'string',
            requiresArg: true,
          },
          'batch-size': {
            description: 'Number of CI pushes to expect in a batch.',
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
            description: 'Make the API description available to the public',
            type: 'boolean',
          },
          files: {
            description: 'List of other folders and files to upload',
            array: true,
            type: 'string',
          },
          'lint-config': {
            description: 'Severity level for config file linting.',
            choices: ['warn', 'error', 'off'] as ReadonlyArray<RuleSeverity>,
            default: 'warn' as RuleSeverity,
          },
        })
        .deprecateOption('batch-id', 'use --job-id')
        .deprecateOption('maybeDestination')
        .implies('job-id', 'batch-size')
        .implies('batch-id', 'batch-size')
        .implies('batch-size', 'job-id'),
    (argv) => {
      process.env.REDOCLY_CLI_COMMAND = 'push';
      commandWrapper(transformPush(handlePush))(argv);
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
          description: 'Reduce output to a maximum of N problems.',
          type: 'number',
          default: 100,
        },
        'generate-ignore-file': {
          description: 'Generate an ignore file.',
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
          description: 'Severity level for config file linting.',
          choices: ['warn', 'error', 'off'] as ReadonlyArray<RuleSeverity>,
          default: 'warn' as RuleSeverity,
        },
        config: {
          description: 'Path to the config file.',
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
      commandWrapper(handleLint)(argv);
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
          hidden: true,
        },
        'max-problems': {
          requiresArg: true,
          description: 'Reduce output to a maximum of N problems.',
          type: 'number',
          hidden: true,
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
          hidden: true,
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
          description: 'Produce a fully dereferenced bundle.',
        },
        force: {
          alias: 'f',
          type: 'boolean',
          description: 'Produce bundle output even when errors occur.',
        },
        config: {
          description: 'Path to the config file.',
          type: 'string',
        },
        lint: {
          description: 'Lint API descriptions',
          type: 'boolean',
          default: false,
          hidden: true,
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
          hidden: true,
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
        'lint-config': {
          description: 'Severity level for config file linting.',
          choices: ['warn', 'error', 'off'] as ReadonlyArray<RuleSeverity>,
          default: 'warn' as RuleSeverity,
        },
      }),
    (argv) => {
      process.env.REDOCLY_CLI_COMMAND = 'bundle';
      commandWrapper(handleBundle)(argv);
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
        config: {
          description: 'Path to the config file.',
          requiresArg: true,
          type: 'string',
        },
      }),
    (argv) => {
      process.env.REDOCLY_CLI_COMMAND = 'login';
      commandWrapper(handleLogin)(argv);
    }
  )
  .command(
    'logout',
    'Clear your stored credentials for the Redocly API registry.',
    (yargs) => yargs,
    async (argv) => {
      process.env.REDOCLY_CLI_COMMAND = 'logout';
      await commandWrapper(async () => {
        const client = new RedoclyClient();
        client.logout();
        process.stdout.write('Logged out from the Redocly account. ✋\n');
      })(argv);
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
          description: 'Use Redoc CE for documentation preview.',
          type: 'boolean',
        },
        force: {
          alias: 'f',
          type: 'boolean',
          description: 'Produce bundle output even when errors occur.',
        },
        config: {
          description: 'Path to the config file.',
          type: 'string',
        },
        'lint-config': {
          description: 'Severity level for config file linting.',
          choices: ['warn', 'error', 'off'] as ReadonlyArray<RuleSeverity>,
          default: 'warn' as RuleSeverity,
        },
      }),
    (argv) => {
      process.env.REDOCLY_CLI_COMMAND = 'preview-docs';
      commandWrapper(previewDocs)(argv);
    }
  )
  .command(
    'build-docs [api]',
    'Produce API documentation as an HTML file',
    (yargs) =>
      yargs
        .positional('api', { type: 'string' })
        .options({
          o: {
            describe: 'Output destination file.',
            alias: 'output',
            type: 'string',
            default: 'redoc-static.html',
          },
          title: {
            describe: 'Page title.',
            type: 'string',
          },
          disableGoogleFont: {
            describe: 'Disable Google fonts.',
            type: 'boolean',
            default: false,
          },
          t: {
            alias: 'template',
            describe: 'Path to handlebars page template, see https://git.io/vh8fP for the example.',
            type: 'string',
          },
          templateOptions: {
            describe:
              'Additional options to pass to the template. Use dot notation, e.g. templateOptions.metaDescription',
          },
          theme: {
            describe:
              'Redoc theme.openapi configuration. Use dot notation, e.g. theme.openapi.nativeScrollbars',
          },
          config: {
            describe: 'Path to the config file.',
            type: 'string',
          },
          'lint-config': {
            description: 'Severity level for config file linting.',
            choices: ['warn', 'error', 'off'] as ReadonlyArray<RuleSeverity>,
            default: 'warn' as RuleSeverity,
          },
        })
        .check((argv: any) => {
          if (argv.theme && !argv.theme?.openapi)
            throw Error('Invalid option: theme.openapi not set');
          return true;
        }),
    async (argv) => {
      process.env.REDOCLY_CLI_COMMAND = 'build-docs';
      commandWrapper(handlerBuildCommand)(argv as Arguments<BuildDocsArgv>);
    }
  )
  .completion('completion', 'Generate completion script.')
  .demandCommand(1)
  .middleware([notifyUpdateCliVersion])
  .strict().argv;
