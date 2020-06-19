#!/usr/bin/env node
import * as yargs from 'yargs';

import { validate } from './validate';

import { bundle } from './bundle';
import { dumpYaml, saveYaml } from './utils';
import { formatMessages } from './format/format';
import { ResolveError, YamlParseError } from './resolve';
import { loadConfig } from './config/config';
import { NormalizedReportMessage } from './walk';
import { red, green, yellow } from 'colorette';

yargs // eslint-disable-line
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
        .option('short', {
          description: 'Reduce output to required minimun.',
          type: 'boolean',
        })
        .option('max-messages', {
          requiresArg: true,
          description: 'Reduce output to max N messages.',
          type: 'number',
          default: 100,
        })
        .option('config', {
          description: 'Specify custom config file',
          requiresArg: true,
          type: 'string',
        }),
    async (argv) => {
      const config = await loadConfig(argv.config);

      for (const entryPoint of argv.entrypoints) {
        try {
          console.time(`${entryPoint} validation took`);
          const results = await validate({
            ref: entryPoint,
            config: config.lint,
          });
          console.timeEnd(`${entryPoint} validation took`);

          console.time(`Formatting messages took`);
          formatMessages(results, {
            format: argv.short ? 'short' : 'full',
            maxMessages: argv['max-messages'],
          });

          const totals = getTotals(results);
          printLintTotals(totals);

          console.timeEnd(`Formatting messages took`);

          process.exit(totals.errors > 0 ? 1 : 0);
        } catch (e) {
          handleError(e, entryPoint);
        }
      }
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
        .option('config', {
          description: 'Specify custom config file',
          type: 'string',
        })
        .options({
          output: { type: 'string', alias: 'o' },
        }),
    async (argv) => {
      for (const entryPoint of argv.entrypoints) {
        try {
          console.time(`${entryPoint} bundle took`);

          const { bundle: result, messages } = await bundle({
            ref: entryPoint,
          });

          console.timeEnd(`${entryPoint} bundle took`);

          if (result) {
            const output = dumpYaml(result);
            if (!argv.output) {
              process.stdout.write(output);
            } else {
              saveYaml(argv.output, result);
            }
          }

          console.log(messages.length ? 'Failed to bundle' : 'Bundled successfully');
          formatMessages(messages, {});
        } catch (e) {
          handleError(e, entryPoint);
        }
      }
    },
  )
  .demandCommand(1)
  .strict().argv;

function handleError(e: Error, ref: string) {
  if (e instanceof ResolveError) {
    process.stdout.write(
      `Failed to resolve entrypoint definition at ${ref}:\n\n  - ${e.message}\n`,
    );
  } else if (e instanceof YamlParseError) {
    process.stdout.write(`Failed to parse entrypoint definition at ${ref}:\n\n  - ${e.message}\n`);
    // TODO: codeframe
  } else {
    process.stdout.write(`Something went wrong when processing ${ref}:\n\n  - ${e.message}\n`);
    throw e;
  }

  process.exit(1);
}

function printLintTotals(totals: Totals) {
  if (totals.errors > 0) {
    process.stderr.write(
      red(
        `❌ Validation failed with ${pluralize('error', totals.errors)} and ${pluralize(
          'warning',
          totals.warnings,
        )}\n`,
      ),
    );
  } else if (totals.warnings > 0) {
    process.stderr.write(green('Woohoo! Your OpenAPI definition is valid 🎉\n'));
    process.stderr.write(yellow(`You have ${pluralize('warning', totals.warnings)}\n`));
  } else {
    process.stderr.write(green('Woohoo! Your OpenAPI definition is valid 🎉\n'));
  }

  console.log();
}

type Totals = {
  errors: number;
  warnings: number;
};

function getTotals(messages: NormalizedReportMessage[]): Totals {
  let errors = 0;
  let warnings = 0;

  for (const m of messages) {
    if (m.severity === 'error') errors++;
    if (m.severity === 'warning') warnings++;
  }

  return {
    errors,
    warnings,
  };
}

function pluralize(label: string, num: number) {
  return num === 1 ? `1 ${label}` : `${num} ${label}s`;
}
