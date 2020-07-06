#!/usr/bin/env node
import * as yargs from 'yargs';
import { extname, basename, dirname, join } from 'path';

import { validate } from './validate';

import { bundle } from './bundle';
import { dumpBundle, saveBundle, BundleOutputFormat } from './utils';
import { formatMessages, OutputFormat } from './format/format';
import { ResolveError, YamlParseError } from './resolve';
import { loadConfig, Config, LintConfig } from './config/config';
import { NormalizedReportMessage } from './walk';
import { red, green, yellow, blue, gray } from 'colorette';
import { performance } from 'perf_hooks';
import { previewDocs } from './cli/preview-docs';

const outputExtensions = ['json', 'yaml', 'yml'] as ReadonlyArray<BundleOutputFormat>;

yargs // eslint-disable-line
  .version()
  .command(
    'lint [entrypoints...]',
    'Lint definition',
    (yargs) =>
      yargs
        .positional('entrypoints', {
          array: true,
          type: 'string',
          demandOption: true,
        })
        .option('format', {
          description: 'Use a specific output format.',
          choices: ['stylish', 'codeframe'] as ReadonlyArray<OutputFormat>,
          default: 'codeframe' as OutputFormat,
        })
        .option('max-messages', {
          requiresArg: true,
          description: 'Reduce output to max N messages.',
          type: 'number',
          default: 100,
        })
        .option('generate-ignore-file', {
          description: 'Generate ignore file',
          type: 'boolean',
        })
        .option('skip-rule', {
          description: 'ignore certain rules',
          array: true,
          type: 'string',
        })
        .option('skip-preprocessor', {
          description: 'ignore certain preprocessor',
          array: true,
          type: 'string',
        })
        .option('config', {
          description: 'Specify custom config file',
          requiresArg: true,
          type: 'string',
        }),
    async (argv) => {
      const config = await loadConfig(argv.config);
      config.lint.skipRules(argv['skip-rule']);
      config.lint.skipPreprocessors(argv['skip-preprocessor']);

      const entrypoints = getFallbackEntryPointsOrExit(argv.entrypoints, config);

      if (argv['generate-ignore-file']) {
        config.lint.ignore = {}; // clear ignore
      }

      const totals: Totals = { errors: 0, warnings: 0, ignored: 0 };
      let totalIgnored = 0;

      // TODO: use shared externalRef resolver, blocked by preprocessors now as they can mutate documents
      for (const entryPoint of entrypoints) {
        try {
          const startedAt = performance.now();
          process.stderr.write(gray(`validating ${entryPoint}...\n`));
          const results = await validate({
            ref: entryPoint,
            config,
          });

          const fileTotals = getTotals(results);
          totals.errors += fileTotals.errors;
          totals.warnings += fileTotals.warnings;
          totals.ignored += fileTotals.ignored;

          if (argv['generate-ignore-file']) {
            for (let m of results) {
              config.lint.addIgnore(m);
              totalIgnored++;
            }
          } else {
            formatMessages(results, {
              format: argv.format,
              maxMessages: argv['max-messages'],
            });
          }

          const elapsed = process.env.NODE_ENV === 'test' ? '<test>ms': `in ${Math.ceil(performance.now() - startedAt)}ms`;
          process.stderr.write(gray(`${entryPoint}: validated in ${elapsed}\n\n`));
        } catch (e) {
          totals.errors++;
          handleError(e, entryPoint);
        }
      }

      if (argv['generate-ignore-file']) {
        config.lint.saveIgnore();
        process.stderr.write(
          `Generated ignore file with ${totalIgnored} ${pluralize('message', totalIgnored)}.\n\n`,
        );
      } else {
        printLintTotals(totals, entrypoints.length);
      }

      printUnusedWarnings(config.lint);
      process.exit(totals.errors === 0 || argv['generate-ignore-file'] ? 0 : 1);
    },
  )
  .command(
    'bundle [entrypoints...]',
    'Bundle definition',
    (yargs) =>
      yargs
        .positional('entrypoints', {
          array: true,
          type: 'string',
          demandOption: true,
        })
        .options({
          output: { type: 'string', alias: 'o' },
        })
        .option('format', {
          description: 'Use a specific output format.',
          choices: ['stylish', 'codeframe'] as ReadonlyArray<OutputFormat>,
          default: 'codeframe' as OutputFormat,
        })
        .option('max-messages', {
          requiresArg: true,
          description: 'Reduce output to max N messages.',
          type: 'number',
          default: 100,
        })
        .option('ext', {
          description: 'Output extension: json, yaml or yml',
          requiresArg: true,
          choices: outputExtensions,
        })
        .option('skip-rule', {
          description: 'ignore certain rules',
          array: true,
          type: 'string',
        })
        .option('skip-preprocessor', {
          description: 'ignore certain preprocessors',
          array: true,
          type: 'string',
        })
        .option('skip-decorator', {
          description: 'ignore certain preprocessor',
          array: true,
          type: 'string',
        })
        .option('force', {
          alias: 'f',
          type: 'boolean',
          description: 'Produce bundle output file even if validation errors were encountered',
        })
        .option('config', {
          description: 'Specify custom config file',
          type: 'string',
        }),
    async (argv) => {
      const config = await loadConfig(argv.config);
      config.lint.skipRules(argv['skip-rule']);
      config.lint.skipPreprocessors(argv['skip-preprocessor']);
      config.lint.skipDecorators(argv['skip-decorator']);

      const entrypoints = getFallbackEntryPointsOrExit(argv.entrypoints, config);

      const totals: Totals = { errors: 0, warnings: 0, ignored: 0 };
      for (const entrypoint of entrypoints) {
        try {
          const startedAt = performance.now();
          process.stderr.write(gray(`bundling ${entrypoint}...\n`));
          const { bundle: result, messages } = await bundle({
            config,
            ref: entrypoint,
          });

          const fileTotals = getTotals(messages);

          const { outputFile, ext } = getOutputFileName(
            entrypoint,
            entrypoints.length,
            argv.output,
            argv.ext,
          );

          if (fileTotals.errors === 0 || argv.force) {
            const output = dumpBundle(result, argv.ext || 'yaml');
            if (!argv.output) {
              process.stdout.write(output);
            } else {
              saveBundle(outputFile, result, ext);
            }
          }

          totals.errors += fileTotals.errors;
          totals.warnings += fileTotals.warnings;
          totals.ignored += fileTotals.ignored;

          formatMessages(messages, {
            format: argv.format,
            maxMessages: argv['max-messages'],
          });

          const elapsed =
            process.env.NODE_ENV === 'test'
              ? '<test>ms'
              : `in ${Math.ceil(performance.now() - startedAt)}ms`;
          if (fileTotals.errors > 0) {
            if (argv.force) {
              process.stderr.write(
                `❓ Force created a bundle for ${blue(entrypoint)} at ${blue(outputFile)} ${green(
                  elapsed,
                )}. ${yellow('Errors ignored because of --force')}\n`,
              );
            } else {
              process.stderr.write(
                `❌ Errors encountered while bundling ${blue(
                  entrypoint,
                )}: bundle not created (use --force to ignore errors)\n`,
              );
            }
          } else {
            process.stderr.write(
              `📦 Created a bundle for ${blue(entrypoint)} at ${blue(outputFile)} ${green(
                elapsed,
              )}\n`,
            );
          }
        } catch (e) {
          handleError(e, entrypoint);
        }
      }

      printUnusedWarnings(config.lint);
      process.exit(totals.errors === 0 || argv.force ? 0 : 1);
    },
  )
  .command(
    'preview-docs [entrypoint]',
    'Preview API Reference docs for the specified entrypoint OAS definition',
    (yargs) =>
      yargs
        .positional('entrypoint', {
          type: 'string',
          demandOption: true,
        })
        .option('port', {
          alias: 'p',
          type: 'number',
          default: 8080,
          description: 'Preview port',
        })
        .option('skip-rule', {
          description: 'ignore certain rules',
          array: true,
          type: 'string',
        })
        .option('skip-preprocessor', {
          description: 'ignore certain preprocessors',
          array: true,
          type: 'string',
        })
        .option('skip-decorator', {
          description: 'ignore certain preprocessor',
          array: true,
          type: 'string',
        })
        .option('--use-community-edition', {
          description: 'Force using Redoc CE for docs preview',
          type: 'boolean',
        })
        .option('force', {
          alias: 'f',
          type: 'boolean',
          description: 'Produce bundle output file even if validation errors were encountered',
        })
        .option('config', {
          description: 'Specify custom config file',
          type: 'string',
        }),
    async (argv) => {
      previewDocs(argv);
    },
  )
  .demandCommand(1)
  .strict().argv;

function getOutputFileName(
  entrypoint: string,
  entries: number,
  output?: string,
  ext?: BundleOutputFormat,
) {
  if (!output) {
    return { outputFile: 'stdout', ext: ext || 'yaml' };
  }

  let outputFile = output;
  if (entries > 1) {
    ext = ext || (extname(entrypoint).substring(1) as BundleOutputFormat);
    if (!outputExtensions.includes(ext as any)) {
      throw new Error(`Invalid file extension: ${ext}.`);
    }
    outputFile = join(output, basename(entrypoint, extname(entrypoint))) + '.' + ext;
  } else {
    ext = ext || (extname(entrypoint).substring(1) as BundleOutputFormat);
    if (!outputExtensions.includes(ext as any)) {
      throw new Error(`Invalid file extension: ${ext}.`);
    }
    outputFile = join(dirname(outputFile), basename(outputFile, extname(outputFile))) + '.' + ext;
  }
  return { outputFile, ext };
}

function handleError(e: Error, ref: string) {
  if (e instanceof ResolveError) {
    process.stderr.write(
      `Failed to resolve entrypoint definition at ${ref}:\n\n  - ${e.message}.\n\n`,
    );
  } else if (e instanceof YamlParseError) {
    process.stderr.write(
      `Failed to parse entrypoint definition at ${ref}:\n\n  - ${e.message}.\n\n`,
    );
    // TODO: codeframe
  } else {
    process.stderr.write(`Something went wrong when processing ${ref}:\n\n  - ${e.message}.\n\n`);
    throw e;
  }
}

function printLintTotals(totals: Totals, definitionsCount: number) {
  const ignored = totals.ignored
    ? yellow(`${totals.ignored} ${pluralize('message is', totals.ignored)} explicitly ignored.\n`)
    : '';

  if (totals.errors > 0) {
    process.stderr.write(
      red(
        `❌ Validation failed with ${totals.errors} ${pluralize('error', totals.errors)} and ${
          totals.warnings
        } ${pluralize('warning', totals.warnings)}. ${ignored}\n`,
      ),
    );
  } else if (totals.warnings > 0) {
    process.stderr.write(
      green(`Woohoo! Your OpenAPI ${pluralize('definition is', definitionsCount)} valid. 🎉\n`),
    );
    process.stderr.write(
      yellow(`You have ${totals.warnings} ${pluralize('warning', totals.warnings)} ${ignored}\n`),
    );
  } else {
    process.stderr.write(
      green(
        `Woohoo! Your OpenAPI ${pluralize(
          'definition is',
          definitionsCount,
        )} valid. 🎉 ${ignored}\n`,
      ),
    );
  }

  if (totals.errors > 0) {
    process.stderr.write(
      gray(`\nrun with \`--generate-ignore-file\` to add all messages to ignore file.\n`),
    );
  }

  process.stderr.write('\n');
}

export type Totals = {
  errors: number;
  warnings: number;
  ignored: number;
};

export function getTotals(messages: (NormalizedReportMessage & { ignored?: boolean })[]): Totals {
  let errors = 0;
  let warnings = 0;
  let ignored = 0;

  for (const m of messages) {
    if (m.ignored) {
      ignored++;
      continue;
    }
    if (m.severity === 'error') errors++;
    if (m.severity === 'warn') warnings++;
  }

  return {
    errors,
    warnings,
    ignored,
  };
}

function pluralize(label: string, num: number) {
  if (label.endsWith('is')) {
    [label] = label.split(' ');
    return num === 1 ? `${label} is` : `${label}s are`;
  }

  return num === 1 ? `${label}` : `${label}s`;
}

export function getFallbackEntryPointsOrExit(argsEntrypoints: string[] | undefined, config: Config) {
  let res = argsEntrypoints;
  if (
    (!argsEntrypoints || !argsEntrypoints.length) &&
    config.apiDefinitions &&
    Object.keys(config.apiDefinitions).length > 0
  ) {
    res = Object.values(config.apiDefinitions);
  } else if (argsEntrypoints && argsEntrypoints.length && config.apiDefinitions) {
    res = res!.map((aliasOrPath) => config.apiDefinitions[aliasOrPath] || aliasOrPath);
  }

  if (!res || !res.length) {
    process.stderr.write('error: missing required argument `entrypoints`.\n');
    process.exit(1);
  }

  return res;
}

function printUnusedWarnings(config: LintConfig) {
  const { preprocessors, rules, decorators } = config.getUnusedRules();
  if (rules.length) {
    process.stderr.write(
      yellow(`[WARNING] Unused rules found in ${blue(config.configFile || '')}: ${rules.join(', ')}.\n`),
    );
  }
  if (preprocessors.length) {
    process.stderr.write(
      yellow(
        `[WARNING] Unused preprocessors found in ${blue(config.configFile || '')}: ${preprocessors.join(
          ', ',
        )}.\n`,
      ),
    );
  }
  if (decorators.length) {
    process.stderr.write(
      yellow(
        `[WARNING] Unused decorators found in ${blue(config.configFile || '')}: ${decorators.join(
          ', ',
        )}.\n`,
      ),
    );
  }

  if (rules.length || preprocessors.length) {
    process.stderr.write(`Check the spelling and verify you added plugin prefix.\n`);
  }
}
