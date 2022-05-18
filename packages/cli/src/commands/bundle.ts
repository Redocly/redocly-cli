import {
  formatProblems,
  getTotals,
  loadConfig,
  getMergedConfig,
  OutputFormat,
  lint,
  bundle,
} from '@redocly/openapi-core';
import {
  dumpBundle,
  getExecutionTime,
  getFallbackEntryPointsOrExit,
  getOutputFileName,
  handleError,
  printUnusedWarnings,
  saveBundle,
  printLintTotals,
} from '../utils';
import { OutputExtensions, Totals } from '../types';
import { performance } from 'perf_hooks';
import { blue, gray, green, red, yellow } from 'colorette';
import { writeFileSync } from 'fs';

export async function handleBundle(
  argv: {
    entrypoints: string[];
    output?: string;
    ext: OutputExtensions;
    'max-problems'?: number;
    'skip-rule'?: string[];
    'skip-preprocessor'?: string[];
    'skip-decorator'?: string[];
    dereferenced?: boolean;
    force?: boolean;
    config?: string;
    lint?: boolean;
    format: OutputFormat;
    metafile?: string;
    extends?: string[];
    'remove-unused-components'?: boolean;
  },
  version: string,
) {
  const config = await loadConfig(argv.config, argv.extends);
  const removeUnusedComponents =
    argv['remove-unused-components'] &&
    !config.rawConfig.lint?.decorators?.hasOwnProperty('remove-unused-components');
  const entrypoints = await getFallbackEntryPointsOrExit(argv.entrypoints, config);
  const totals: Totals = { errors: 0, warnings: 0, ignored: 0 };
  const maxProblems = argv['max-problems'];

  for (const { path, alias } of entrypoints) {
    try {
      const startedAt = performance.now();
      const resolvedConfig = getMergedConfig(config, alias);
      resolvedConfig.lint.skipRules(argv['skip-rule']);
      resolvedConfig.lint.skipPreprocessors(argv['skip-preprocessor']);
      resolvedConfig.lint.skipDecorators(argv['skip-decorator']);

      if (argv.lint) {
        if (config.lint.recommendedFallback) {
          process.stderr.write(
            `No configurations were defined in extends -- using built in ${blue(
              'recommended',
            )} configuration by default.\n${red(
              'Warning! This default behavior is going to be deprecated soon.',
            )}\n\n`,
          );
        }
        const results = await lint({
          ref: path,
          config: resolvedConfig,
        });
        const fileLintTotals = getTotals(results);

        totals.errors += fileLintTotals.errors;
        totals.warnings += fileLintTotals.warnings;
        totals.ignored += fileLintTotals.ignored;

        formatProblems(results, {
          format: argv.format || 'codeframe',
          totals: fileLintTotals,
          version,
          maxProblems,
        });
        printLintTotals(fileLintTotals, 2);
      }

      process.stderr.write(gray(`bundling ${path}...\n`));

      const {
        bundle: result,
        problems,
        ...meta
      } = await bundle({
        config: resolvedConfig,
        ref: path,
        dereference: argv.dereferenced,
        removeUnusedComponents,
      });

      const fileTotals = getTotals(problems);
      const { outputFile, ext } = getOutputFileName(
        path,
        entrypoints.length,
        argv.output,
        argv.ext,
      );

      if (fileTotals.errors === 0 || argv.force) {
        if (!argv.output) {
          const output = dumpBundle(result.parsed, argv.ext || 'yaml', argv.dereferenced);
          process.stdout.write(output);
        } else {
          const output = dumpBundle(result.parsed, ext, argv.dereferenced);
          saveBundle(outputFile, output);
        }
      }

      totals.errors += fileTotals.errors;
      totals.warnings += fileTotals.warnings;
      totals.ignored += fileTotals.ignored;

      formatProblems(problems, {
        format: argv.format,
        maxProblems,
        totals: fileTotals,
        version,
      });

      if (argv.metafile) {
        if (entrypoints.length > 1) {
          process.stderr.write(
            yellow(`[WARNING] "--metafile" cannot be used with multiple entrypoints. Skipping...`),
          );
        }
        {
          writeFileSync(argv.metafile, JSON.stringify(meta), 'utf-8');
        }
      }

      const elapsed = getExecutionTime(startedAt);
      if (fileTotals.errors > 0) {
        if (argv.force) {
          process.stderr.write(
            `❓ Created a bundle for ${blue(path)} at ${blue(outputFile)} with errors ${green(
              elapsed,
            )}.\n${yellow('Errors ignored because of --force')}.\n`,
          );
        } else {
          process.stderr.write(
            `❌ Errors encountered while bundling ${blue(
              path,
            )}: bundle not created (use --force to ignore errors).\n`,
          );
        }
      } else {
        process.stderr.write(
          `📦 Created a bundle for ${blue(path)} at ${blue(outputFile)} ${green(elapsed)}.\n`,
        );
      }

      const removedCount = meta.visitorsData?.['remove-unused-components']?.removedCount;
      if (removedCount) {
        process.stderr.write(gray(`🧹 Removed ${removedCount} unused components.\n`));
      }
    } catch (e) {
      handleError(e, path);
    }
  }

  printUnusedWarnings(config.lint);

  // defer process exit to allow STDOUT pipe to flush
  // see https://github.com/nodejs/node-v0.x-archive/issues/3737#issuecomment-19156072
  process.once('exit', () => process.exit(totals.errors === 0 || argv.force ? 0 : 1));
}
