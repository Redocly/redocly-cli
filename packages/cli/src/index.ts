#!/usr/bin/env node
import './utils/assert-node-version.js';

import {
  logger,
  type OutputFormat,
  type RuleSeverity,
  type ComponentNamesStrategy,
} from '@redocly/openapi-core';
import * as dotenv from 'dotenv';
import * as path from 'node:path';
import yargs, { type Arguments } from 'yargs';
import { hideBin } from 'yargs/helpers';

import { handleLogin, handleLogout } from './commands/auth.js';
import type { BuildDocsArgv } from './commands/build-docs/types.js';
import { handleBundle } from './commands/bundle.js';
import type { ReportFormat } from './commands/drift/engine/reporter.js';
import { type DriftArgv } from './commands/drift/index.js';
import type { FindingSeverity, MatchMode, TrafficFormat } from './commands/drift/types/index.js';
import { handleEject, type EjectArgv } from './commands/eject.js';
import {
  handleGenerateArazzo,
  type GenerateArazzoCommandArgv,
} from './commands/generate-arazzo.js';
import {
  handleGenerateClient,
  type GenerateClientCommandArgv,
} from './commands/generate-client.js';
import { handleJoin } from './commands/join/index.js';
import { handleLint } from './commands/lint.js';
import { PRODUCT_PLANS } from './commands/preview-project/constants.js';
import { previewProject } from './commands/preview-project/index.js';
import { type ProxyArgv } from './commands/proxy/index.js';
import { handleRespect, type RespectArgv } from './commands/respect/index.js';
import { validateMtlsCommandOption } from './commands/respect/mtls/validate-mtls-command-option.js';
import { handleScore } from './commands/score/index.js';
import { handleScorecardClassic } from './commands/scorecard-classic/index.js';
import type {
  ScorecardClassicArgv,
  ScorecardClassicOutputFormat,
} from './commands/scorecard-classic/types.js';
import { handleSplit } from './commands/split/index.js';
import { handleStats } from './commands/stats/index.js';
import { handleTranslations } from './commands/translations.js';
import { handlePushStatus } from './reunite/commands/push-status.js';
import { handlePush } from './reunite/commands/push.js';
import { outputExtensions } from './types.js';
import { version } from './utils/package.js';
import { cacheLatestVersion, notifyUpdateCliVersion } from './utils/update-version-notifier.js';
import { validateMountPath } from './utils/validate-mount-path.js';
import { validatePositiveNumber } from './utils/validate-positive-number.js';
import { commandWrapper } from './wrapper.js';

dotenv.config({ path: path.resolve(process.cwd(), './.env') });

cacheLatestVersion();

// TODO: word wrapping is broken (https://github.com/yargs/yargs/issues/2112)
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
yargs(hideBin(process.argv))
  .version('version', 'Show version number.', version)
  .help('help', 'Show help.')
  .parserConfiguration({ 'greedy-arrays': false, 'boolean-negation': false })
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
      commandWrapper(handleStats)(argv);
    }
  )
  .command(
    'score [api]',
    'Score an API description for integration simplicity and agent readiness.',
    (yargs) =>
      yargs
        .env('REDOCLY_CLI_SCORE')
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
            choices: ['stylish', 'json'] as ReadonlyArray<OutputFormat>,
            default: 'stylish' as OutputFormat,
          },
          'operation-details': {
            description: 'Print per-operation metric details.',
            type: 'boolean' as const,
            default: false,
          },
          'debug-operation-id': {
            description: 'Print detailed schema breakdown for a specific operation.',
            type: 'string' as const,
          },
        }),
    (argv) => {
      commandWrapper(handleScore)(argv);
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
          domain: {
            description: 'Specify a domain.',
            alias: 'd',
            type: 'string',
            required: false,
          },
          wait: {
            description: 'Wait for build to finish.',
            type: 'boolean',
            default: false,
          },
          'max-execution-time': {
            description: 'Maximum execution time in seconds.',
            type: 'number',
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
            coerce: validateMountPath,
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
          domain: {
            description: 'Specify a domain.',
            alias: 'd',
            type: 'string',
          },
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
              'junit',
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
          'component-renaming-conflicts-severity': {
            description:
              'Whether to show warnings or fail on renaming conflicts (defaults to warn).',
            choices: ['warn', 'error', 'off'] as ReadonlyArray<RuleSeverity>,
          },
          'component-names-strategy': {
            description:
              "How to name inlined Schema components: 'basename' (default) or 'title' (from each schema's `title`).",
            choices: ['basename', 'title'] as ReadonlyArray<ComponentNamesStrategy>,
            default: 'basename' as ComponentNamesStrategy,
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
        verbose: {
          alias: 'v',
          describe: 'Apply verbose mode.',
          type: 'boolean',
        },
      }),
    (argv) => {
      commandWrapper(handleLogin)(argv);
    }
  )
  .command(
    'logout',
    'Clear your stored credentials.',
    (yargs) => yargs,
    (argv) => {
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
            throw new Error('Invalid option: theme.openapi not set.');
          return true;
        }),
    async (argv) => {
      const { handlerBuildCommand } = await import('./commands/build-docs/index.js');
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
          mtls: {
            describe:
              'Per-domain mutual TLS certificates configuration as JSON. Format: {"<domain>": {"clientCert": "<path>", "clientKey": "<path>", "caCert": "<path>"}}',
            type: 'string',
            array: true,
            coerce: validateMtlsCommandOption,
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
          'no-secrets-masking': {
            describe: 'Do not mask secrets in the output.',
            type: 'boolean',
            default: false,
          },
        });
    },
    async (argv) => {
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
      commandWrapper(handleGenerateArazzo)(argv as Arguments<GenerateArazzoCommandArgv>);
    }
  )
  .command(
    'generate-client [api]',
    'Generate a TypeScript client from an OpenAPI description [experimental].',
    (yargs) => {
      return yargs
        .env('REDOCLY_CLI_GENERATE_CLIENT')
        .positional('api', {
          describe: 'OpenAPI description file path (or alias from redocly.yaml `apis:`).',
          type: 'string',
        })
        .options({
          output: {
            alias: 'o',
            describe: 'Output file path for the generated client (must end in .ts).',
            type: 'string',
            requiresArg: true,
          },
          'server-url': {
            describe:
              'Override the server URL inlined into the generated runtime. Defaults to `servers[0].url`.',
            type: 'string',
            requiresArg: true,
          },
          'enum-style': {
            describe:
              'How named string enums are emitted: `const-object` (default) emits a runtime `as const` object alongside the union type; `union` emits only the union.',
            choices: ['union', 'const-object'] as const,
            requiresArg: true,
          },
          'output-mode': {
            describe:
              'How the client is split across files: `single` (default, one file) or `split` (schema types and guards in a sibling `<name>.schemas.ts` the entry re-exports).',
            choices: ['single', 'split'] as const,
            requiresArg: true,
          },
          runtime: {
            describe:
              "Runtime distribution: 'inline' (default) embeds the runtime in the generated file; 'package' imports it from @redocly/client-generator.",
            choices: ['inline', 'package'] as const,
            requiresArg: true,
          },
          setup: {
            describe:
              'Path to a publisher setup module (export default defineClientSetup({ config, middleware })) baked into the generated client, so a published SDK ships its request/response defaults built in. Works across all output modes.',
            type: 'string',
            requiresArg: true,
          },
          'args-style': {
            describe:
              'How operation inputs are passed: `flat` (default) spreads path params as positional arguments followed by `params`/`body`/`headers`; `grouped` bundles every input into a single `args` object (the per-call request `init` stays a separate trailing argument).',
            choices: ['flat', 'grouped'] as const,
            requiresArg: true,
          },
          'error-mode': {
            describe:
              "Error handling: 'throw' (default) throws ApiError on non-2xx; 'result' returns { data, error, response }.",
            choices: ['throw', 'result'] as const,
            requiresArg: true,
          },
          'date-type': {
            describe:
              "How `date-time`/`date` string fields are typed: 'string' (default) keeps the ISO wire shape; 'Date' emits a `Date` (pair with --generators transformers so the runtime value matches).",
            choices: ['string', 'Date'] as const,
            requiresArg: true,
          },
          'query-framework': {
            describe:
              'TanStack Query adapter the `tanstack-query` generator imports from: `react` (default), `vue`, `svelte`, or `solid`. Only the import specifier changes — the emitted factory module is byte-identical across frameworks.',
            choices: ['react', 'vue', 'svelte', 'solid'] as const,
            requiresArg: true,
          },
          'mock-data': {
            describe:
              "How the `mock` generator produces data: 'baked' (default) inlines deterministic literals (zero-dep); 'faker' emits @faker-js/faker calls for realistic data (install @faker-js/faker as a dev dependency).",
            choices: ['baked', 'faker'] as const,
            requiresArg: true,
          },
          'mock-seed': {
            describe:
              'Seed for faker-mode mocks: emits a top-level `faker.seed(<n>)` so generated data is reproducible across runs. Ignored in baked mode.',
            type: 'number',
            requiresArg: true,
          },
          generator: {
            describe:
              'Generator to run; repeat the flag to run several (default: sdk). A built-in name (sdk, zod, tanstack-query, swr, transformers, mock) or a custom-generator path/package specifier. Example: --generator sdk --generator zod',
            type: 'string',
            array: true,
            requiresArg: true,
          },
          config: {
            describe: 'Path to the config file.',
            type: 'string',
            requiresArg: true,
          },
        });
    },
    async (argv) => {
      commandWrapper(handleGenerateClient)(argv as Arguments<GenerateClientCommandArgv>);
    }
  )
  .command(
    'scorecard-classic [api]',
    'Run quality scorecards with multiple rule levels to validate and maintain API description standards.',
    (yargs) => {
      return yargs.positional('api', { type: 'string' }).option({
        config: {
          describe: 'Path to the config file.',
          type: 'string',
        },
        'project-url': {
          describe: 'URL to the project scorecard configuration.',
          type: 'string',
        },
        format: {
          description: 'Use a specific output format.',
          choices: [
            'stylish',
            'json',
            'checkstyle',
            'junit',
          ] as ReadonlyArray<ScorecardClassicOutputFormat>,
          default: 'stylish' as ScorecardClassicOutputFormat,
        },
        'target-level': {
          describe: 'Target level for the scorecard.',
          type: 'string',
        },
        verbose: {
          alias: 'v',
          describe: 'Apply verbose mode.',
          type: 'boolean',
        },
      });
    },
    async (argv) => {
      commandWrapper(handleScorecardClassic)(argv as Arguments<ScorecardClassicArgv>);
    }
  )
  .command(
    'drift <traffic>',
    'Detect drift between recorded HTTP traffic and an OpenAPI description [experimental].',
    (yargs) =>
      yargs
        .env('REDOCLY_CLI_DRIFT')
        .positional('traffic', {
          describe: 'Path to a traffic log file or folder (HAR, Kong, Nginx/Apache JSON, NDJSON).',
          type: 'string',
        })
        .option({
          api: {
            describe: 'OpenAPI description file or folder to validate against.',
            type: 'string',
            demandOption: true,
          },
          'traffic-format': {
            describe: 'Traffic input format.',
            choices: [
              'auto',
              'har',
              'kong',
              'nginx-json',
              'apache-json',
              'ndjson',
            ] as ReadonlyArray<TrafficFormat>,
            default: 'auto' as TrafficFormat,
          },
          'report-format': {
            describe: 'Output format.',
            alias: 'format',
            choices: ['pretty', 'json', 'csv', 'sarif'] as ReadonlyArray<ReportFormat>,
            default: 'pretty' as ReportFormat,
          },
          'match-mode': {
            describe:
              'Endpoint matching mode (how requests are located via the description servers). Mutually exclusive with --server.',
            choices: ['strict-host', 'basepath'] as ReadonlyArray<MatchMode>,
            defaultDescription: 'strict-host',
          },
          'ignore-cookies': {
            describe: 'Ignore cookie-based checks (useful for logs exported without cookies).',
            type: 'boolean',
            default: false,
          },
          'max-findings': {
            describe: 'Maximum findings shown in pretty output.',
            type: 'number',
            default: 10,
          },
          'min-severity': {
            describe: 'Discard findings below this severity from the report.',
            choices: ['info', 'warning', 'error'] as ReadonlyArray<FindingSeverity>,
            default: 'info' as FindingSeverity,
          },
          rules: {
            describe: 'Comma-separated builtin rules to run.',
            type: 'string',
          },
          output: {
            alias: 'o',
            describe:
              'Write the drift report (in the format selected with --format) to this file instead of stdout.',
            type: 'string',
          },
          server: {
            describe:
              'Server URL the traffic was captured against: only requests under it are considered, and the rest of their URL is treated as the API path. It replaces the description servers and the remaining path is matched against the description paths directly. Mutually exclusive with --match-mode.',
            type: 'string',
          },
          config: { describe: 'Path to the config file.', type: 'string' },
          'lint-config': {
            describe: 'Severity level for config file linting.',
            choices: ['warn', 'error', 'off'] as ReadonlyArray<RuleSeverity>,
            default: 'warn' as RuleSeverity,
          },
        }),
    async (argv) => {
      const { handleDrift } = await import('./commands/drift/index.js');
      commandWrapper(handleDrift)(argv as Arguments<DriftArgv>);
    }
  )
  .command(
    'proxy',
    'Capture live HTTP traffic through a reverse proxy into a HAR file, optionally validating it against an OpenAPI description [experimental].',
    (yargs) =>
      yargs.env('REDOCLY_CLI_PROXY').option({
        target: {
          describe: 'Upstream base URL to forward captured requests to.',
          type: 'string',
          demandOption: true,
        },
        port: {
          describe: 'Port the proxy listens on.',
          type: 'number',
          default: 4040,
        },
        host: {
          describe: 'Host the proxy binds to.',
          type: 'string',
          default: '127.0.0.1',
        },
        har: {
          describe: 'Path to the HAR file where captured traffic is written.',
          type: 'string',
          demandOption: true,
        },
        api: {
          describe:
            'OpenAPI description file or folder to validate captured traffic against (live).',
          type: 'string',
        },
        'report-format': {
          describe: 'Output format for the validation report printed on shutdown.',
          alias: 'format',
          choices: ['pretty', 'json', 'csv', 'sarif'] as ReadonlyArray<ReportFormat>,
          default: 'pretty' as ReportFormat,
        },
        'match-mode': {
          describe: 'Endpoint matching mode.',
          choices: ['strict-host', 'basepath'] as ReadonlyArray<MatchMode>,
          default: 'strict-host' as MatchMode,
        },
        'ignore-cookies': {
          describe: 'Ignore cookie-based checks.',
          type: 'boolean',
          default: false,
        },
        'max-findings': {
          describe: 'Maximum findings shown in pretty output.',
          type: 'number',
          default: 10,
        },
        rules: {
          describe: 'Comma-separated builtin rules to run.',
          type: 'string',
        },
        config: { describe: 'Path to the config file.', type: 'string' },
        'lint-config': {
          describe: 'Severity level for config file linting.',
          choices: ['warn', 'error', 'off'] as ReadonlyArray<RuleSeverity>,
          default: 'warn' as RuleSeverity,
        },
      }),
    async (argv) => {
      const { handleProxy } = await import('./commands/proxy/index.js');
      commandWrapper(handleProxy)(argv as Arguments<ProxyArgv>);
    }
  )
  .completion('completion', 'Generate autocomplete script for `redocly` command.')
  .demandCommand(1)
  .middleware([notifyUpdateCliVersion])
  .strict().argv;
