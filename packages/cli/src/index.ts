#!/usr/bin/env node
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import './utils/assert-node-version.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { logger } from '@redocly/openapi-core';
import { outputExtensions } from './types.js';
import { handleStats } from './commands/stats.js';
import { handleSplit } from './commands/split/index.js';
import { handleJoin } from './commands/join.js';
import { handlePush } from './reunite/commands/push.js';
import { handlePushStatus } from './reunite/commands/push-status.js';
import { handleLint } from './commands/lint.js';
import { handleBundle } from './commands/bundle.js';
import { handleLogin, handleLogout } from './commands/auth.js';
import { handlerBuildCommand } from './commands/build-docs/index.js';
import { cacheLatestVersion, notifyUpdateCliVersion } from './utils/update-version-notifier.js';
import { commandWrapper } from './wrapper.js';
import { previewProject } from './commands/preview-project/index.js';
import { handleTranslations } from './commands/translations.js';
import { handleEject } from './commands/eject.js';
import { PRODUCT_PLANS } from './commands/preview-project/constants.js';
import {
  handleGenerateArazzo,
  type GenerateArazzoCommandArgv,
} from './commands/generate-arazzo.js';
import { handleRespect, type RespectArgv } from './commands/respect.js';
import { version } from './utils/package.js';
import { validatePositiveNumber } from './utils/validate-positive-number.js';

import type { Arguments } from 'yargs';
import type { OutputFormat, RuleSeverity } from '@redocly/openapi-core';
import type { BuildDocsArgv } from './commands/build-docs/types.js';
import type { EjectArgv } from './commands/eject.js';

dotenv.config({ path: path.resolve(process.cwd(), './.env') });

cacheLatestVersion();

// TODO: word wrapping is broken (https://github.com/yargs/yargs/issues/2112)
yargs(hideBin(process.argv))
  .version('version', 'Show version number.', version)
  .help('help', 'Show help.')
  .parserConfiguration({ 'greedy-arrays': false })
  .command(
    'stats [api]',
    'Show statistics for an API description.',
    (yargs) =>
      yargs
        .env('REDOCLY_CLI_STATS')
        .positional('api', { type: 'string' })
        .option({
          config: { description: 'Path to the config file.', type: 'string' },
          'lint-config': {
            description: 'Severity level for config file linting.',
            choices: ['warn', 'error', 'off'] as ReadonlyArray<RuleSeverity>,
            default: 'warn' as RuleSeverity,
          },
          format: {
            description: 'Use a specific output format.',
            choices: ['stylish', 'json', 'markdown'] as ReadonlyArray<OutputFormat>,
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
        .env('REDOCLY_CLI_SPLIT')
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
    'Join multiple API descriptions into one [experimental].',
    (yargs) =>
      yargs
        .env('REDOCLY_CLI_JOIN')
        .positional('apis', {
          array: true,
          type: 'string',
          demandOption: true,
        })
        .option({
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
            description: 'Output file.',
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
      commandWrapper(handleJoin)(argv);
    }
  )
  .command(
    'push-status [pushId]',
    false,
    (yargs) =>
      yargs
        .env('REDOCLY_CLI_PUSH_STATUS')
        .positional('pushId', {
          description: 'Push id.',
          type: 'string',
          demandOption: true,
        })
        .implies('max-execution-time', 'wait')
        .option({
          organization: {
            description: 'Name of the organization to push to.',
            type: 'string',
            alias: 'o',
            required: true,
          },
          project: {
            description: 'Name of the project to push to.',
            type: 'string',
            required: true,
            alias: 'p',
          },
          domain: { description: 'Specify a domain.', alias: 'd', type: 'string', required: false },
          wait: {
            description: 'Wait for build to finish.',
            type: 'boolean',
            default: false,
          },
          'max-execution-time': {
            description: 'Maximum execution time in seconds.',
            type: 'number',
            coerce: validatePositiveNumber('max-execution-time'),
          },
          'continue-on-deploy-failures': {
            description: 'Command does not fail even if the deployment fails.',
            type: 'boolean',
            default: false,
          },
          'lint-config': {
            description: 'Severity level for config file linting.',
            choices: ['warn', 'error', 'off'] as ReadonlyArray<RuleSeverity>,
            default: 'warn' as RuleSeverity,
          },
        }),
    (argv) => {
      process.env.REDOCLY_CLI_COMMAND = 'push-status';
      commandWrapper(handlePushStatus)(argv);
    }
  )
  .command(
    'push [files...]',
    'Push documents to Reunite.',
    (yargs) =>
      yargs
        .env('REDOCLY_CLI_PUSH')
        .positional('files', {
          type: 'string',
          array: true,
          demandOption: true,
        })
        .option({
          branch: {
            description: 'Branch name to push to.',
            type: 'string',
            alias: 'b',
            required: true,
          },
          'lint-config': {
            description: 'Severity level for config file linting.',
            choices: ['warn', 'error', 'off'] as ReadonlyArray<RuleSeverity>,
            default: 'warn' as RuleSeverity,
          },
          organization: {
            description: 'Name of the organization to push to.',
            type: 'string',
            alias: 'o',
            required: true,
          },
          project: {
            description: 'Name of the project to push to.',
            type: 'string',
            alias: 'p',
            required: true,
          },
          'mount-path': {
            description: 'The path files should be pushed to.',
            type: 'string',
            alias: 'mp',
            required: true,
          },
          author: {
            description: 'Author of the commit.',
            type: 'string',
            alias: 'a',
            required: true,
          },
          message: {
            description: 'Commit message.',
            type: 'string',
            alias: 'm',
            required: true,
          },
          'commit-sha': {
            description: 'Commit SHA.',
            type: 'string',
            alias: 'sha',
          },
          'commit-url': {
            description: 'Commit URL.',
            type: 'string',
            alias: 'url',
          },
          namespace: {
            description: 'Repository namespace.',
            type: 'string',
          },
          repository: {
            description: 'Repository name.',
            type: 'string',
          },
          'created-at': {
            description: 'Commit creation date.',
            type: 'string',
          },
          domain: { description: 'Specify a domain.', alias: 'd', type: 'string' },
          config: {
            description: 'Path to the config file.',
            requiresArg: true,
            type: 'string',
          },
          'default-branch': {
            type: 'string',
            default: 'main',
          },
          'max-execution-time': {
            description: 'Maximum execution time in seconds.',
            type: 'number',
            coerce: validatePositiveNumber('max-execution-time'),
          },
          'wait-for-deployment': {
            description: 'Wait for build to finish.',
            type: 'boolean',
            default: false,
          },
          verbose: {
            type: 'boolean',
            default: false,
          },
          'continue-on-deploy-failures': {
            description: 'Command does not fail even if the deployment fails.',
            type: 'boolean',
            default: false,
          },
        }),
    (argv) => {
      process.env.REDOCLY_CLI_COMMAND = 'push';
      commandWrapper(handlePush)(argv);
    }
  )
  .command(
    'lint [apis...]',
    'Lint an API or Arazzo description.',
    (yargs) =>
      yargs
        .env('REDOCLY_CLI_LINT')
        .positional('apis', { array: true, type: 'string', demandOption: true })
        .option({
          format: {
            description: 'Use a specific output format.',
            choices: [
              'stylish',
              'codeframe',
              'json',
              'checkstyle',
              'codeclimate',
              'summary',
              'markdown',
              'github-actions',
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
    'Bundle a multi-file API description to a single file.',
    (yargs) =>
      yargs
        .env('REDOCLY_CLI_BUNDLE')
        .positional('apis', { array: true, type: 'string', demandOption: true })
        .options({
          output: {
            type: 'string',
            description: 'Output file or folder for inline APIs.',
            alias: 'o',
          },
          ext: {
            description: 'Bundle file extension.',
            requiresArg: true,
            choices: outputExtensions,
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
        })
        .check((argv) => {
          if (argv.output && (!argv.apis || argv.apis.length === 0)) {
            throw new Error('At least one inline API must be specified when using --output.');
          }
          return true;
        }),
    (argv) => {
      commandWrapper(handleBundle)(argv);
    }
  )
  .command(
    'check-config',
    'Lint the Redocly configuration file.',
    async (yargs) =>
      yargs.env('REDOCLY_CLI_CHECK_CONFIG').option({
        config: {
          description: 'Path to the config file.',
          type: 'string',
        },
        'lint-config': {
          description: 'Severity level for config file linting.',
          choices: ['warn', 'error'] as ReadonlyArray<RuleSeverity>,
          default: 'error' as RuleSeverity,
        },
      }),
    (argv) => {
      process.env.REDOCLY_CLI_COMMAND = 'check-config';
      commandWrapper()(argv);
    }
  )
  .command(
    'login',
    'Log in to Redocly.',
    async (yargs) =>
      yargs.env('REDOCLY_CLI_LOGIN').options({
        residency: {
          description: 'Residency of the application. Defaults to `us`.',
          alias: ['r'],
          type: 'string',
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
    'Clear your stored credentials.',
    (yargs) => yargs,
    (argv) => {
      process.env.REDOCLY_CLI_COMMAND = 'logout';
      commandWrapper(handleLogout)(argv);
    }
  )
  .command(
    'preview',
    'Preview Redocly project using one of the product NPM packages.',
    (yargs) =>
      yargs.env('REDOCLY_CLI_PREVIEW').options({
        product: {
          type: 'string',
          choices: ['redoc', 'revel', 'reef', 'realm', 'redoc-revel', 'redoc-reef', 'revel-reef'],
          description:
            "Product used to launch preview. Default is inferred from project's package.json or 'realm' is used.",
        },
        plan: {
          type: 'string',
          choices: PRODUCT_PLANS,
          default: 'enterprise',
        },
        port: {
          alias: 'p',
          type: 'number',
          description: 'Preview port.',
          default: 4000,
          coerce: validatePositiveNumber('port', true),
        },
        'project-dir': {
          alias: ['d', 'source-dir'],
          type: 'string',
          description:
            'Specifies the project content directory. The default value is the directory where the command is executed.',
          default: '.',
        },
        'lint-config': {
          description: 'Severity level for config file linting.',
          choices: ['warn', 'error', 'off'] as ReadonlyArray<RuleSeverity>,
          default: 'warn' as RuleSeverity,
        },
      }),
    (argv) => {
      if (process.argv.some((arg) => arg.startsWith('--source-dir'))) {
        logger.error(
          'Option --source-dir is deprecated and will be removed soon. Use --project-dir instead.\n'
        );
      }
      commandWrapper(previewProject)(argv);
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
            describe:
              'Path to handlebars page template, see https://github.com/Redocly/redocly-cli/blob/main/packages/cli/src/commands/build-docs/template.hbs for the example.',
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
            throw Error('Invalid option: theme.openapi not set.');
          return true;
        }),
    async (argv) => {
      process.env.REDOCLY_CLI_COMMAND = 'build-docs';
      commandWrapper(handlerBuildCommand)(argv as Arguments<BuildDocsArgv>);
    }
  )
  .command(
    'translate <locale>',
    'Creates or updates translations.yaml files and fills them with missing built-in translations and translations from the redocly.yaml and sidebars.yaml files.',
    (yargs) =>
      yargs
        .env('REDOCLY_CLI_TRANSLATE')
        .positional('locale', {
          description:
            'Locale code to generate translations for, or `all` for all current project locales.',
          type: 'string',
          demandOption: true,
        })
        .options({
          'project-dir': {
            alias: 'd',
            type: 'string',
            description:
              'Specifies the project content directory. The default value is the directory where the command is executed.',
            default: '.',
          },
          'lint-config': {
            description: 'Severity level for config file linting.',
            choices: ['warn', 'error', 'off'] as ReadonlyArray<RuleSeverity>,
            default: 'warn' as RuleSeverity,
          },
        }),
    (argv) => {
      process.env.REDOCLY_CLI_COMMAND = 'translate';
      commandWrapper(handleTranslations)(argv);
    }
  )
  .command(
    'eject <type> [path]',
    'Helper function to eject project elements for customization.',
    (yargs) =>
      yargs
        .env('REDOCLY_CLI_EJECT')
        .positional('type', {
          description:
            'Specifies what type of project element to eject. Currently this value must be `component`.',
          demandOption: true,
          choices: ['component'],
        })
        .positional('path', {
          description: 'Filepath to a component or filepath with glob pattern.',
          type: 'string',
        })
        .options({
          'project-dir': {
            alias: 'd',
            type: 'string',
            description:
              'Specifies the project content directory. The default value is the directory where the command is executed.',
            default: '.',
          },
          force: {
            alias: 'f',
            type: 'boolean',
            description:
              'Skips the "overwrite existing" confirmation when ejecting a component that is already ejected in the destination.',
          },
          'lint-config': {
            description: 'Severity level for config file linting.',
            choices: ['warn', 'error', 'off'] as ReadonlyArray<RuleSeverity>,
            default: 'warn' as RuleSeverity,
          },
        }),
    (argv) => {
      process.env.REDOCLY_CLI_COMMAND = 'eject';
      commandWrapper(handleEject)(argv as Arguments<EjectArgv>);
    }
  )
  .command(
    'respect [files...]',
    'Run Arazzo tests.',
    (yargs) => {
      return yargs
        .env('REDOCLY_CLI_RESPECT')
        .positional('files', {
          describe: 'Test files or glob pattern.',
          type: 'string',
          array: true,
          default: [],
        })
        .options({
          input: {
            alias: 'i',
            describe: 'Input parameters.',
            type: 'string',
          },
          server: {
            alias: 'S',
            describe: 'Server parameters.',
            type: 'string',
          },
          workflow: {
            alias: 'w',
            describe: 'Workflow name.',
            type: 'string',
            array: true,
          },
          skip: {
            alias: 's',
            describe: 'Workflow to skip.',
            type: 'string',
            array: true,
          },
          verbose: {
            alias: 'v',
            describe: 'Apply verbose mode.',
            type: 'boolean',
          },
          'har-output': {
            describe: 'Har file output name.',
            type: 'string',
            alias: 'H',
          },
          'json-output': {
            describe: 'JSON file output name.',
            type: 'string',
            alias: 'J',
          },
          'client-cert': {
            describe: 'Mutual TLS client certificate.',
            type: 'string',
          },
          'client-key': {
            describe: 'Mutual TLS client key.',
            type: 'string',
          },
          'ca-cert': {
            describe: 'Mutual TLS CA certificate.',
            type: 'string',
          },
          severity: {
            describe: 'Severity of the check.',
            type: 'string',
          },
          'max-steps': {
            describe: 'Maximum number of steps to run (default: 2000).',
            type: 'number',
            default: 2000,
            coerce: validatePositiveNumber('max-steps', true),
          },
          'max-fetch-timeout': {
            describe:
              'Maximum time to wait for API response per request in milliseconds (default: 40 seconds).',
            type: 'number',
            default: 40_000,
            coerce: validatePositiveNumber('max-fetch-timeout', false),
          },
          'execution-timeout': {
            describe:
              'Maximum time to wait for the Respect execution in milliseconds (default: 1 hour).',
            type: 'number',
            default: 3_600_000,
            coerce: validatePositiveNumber('execution-timeout', false),
          },
        });
    },
    async (argv) => {
      process.env.REDOCLY_CLI_COMMAND = 'respect';
      commandWrapper(handleRespect)(argv as Arguments<RespectArgv>);
    }
  )
  .command(
    'generate-arazzo <descriptionPath>',
    'Auto-generate arazzo description file from an API description.',
    (yargs) => {
      return yargs
        .env('REDOCLY_CLI_GENERATE_ARAZZO')
        .positional('descriptionPath', {
          describe: 'Description file path.',
          type: 'string',
        })
        .options({
          'output-file': {
            alias: 'o',
            describe: 'Output File name.',
            type: 'string',
            requiresArg: true,
          },
        });
    },
    async (argv) => {
      process.env.REDOCLY_CLI_COMMAND = 'generate-arazzo';
      commandWrapper(handleGenerateArazzo)(argv as Arguments<GenerateArazzoCommandArgv>);
    }
  )
  .completion('completion', 'Generate autocomplete script for `redocly` command.')
  .demandCommand(1)
  .middleware([notifyUpdateCliVersion])
  .strict().argv;
