import {
  formatProblems,
  getTotals,
  getMergedConfig,
  lint,
  bundle,
  Config,
  OutputFormat,
} from '@redocly/openapi-core';
import {
  dumpBundle,
  getExecutionTime,
  getFallbackApisOrExit,
  getOutputFileName,
  handleError,
  printUnusedWarnings,
  saveBundle,
  printLintTotals,
  checkIfRulesetExist,
  sortTopLevelKeysForOas,
} from '../utils';
import type { OutputExtensions, Skips, Totals } from '../types';
import { performance } from 'perf_hooks';
import { blue, gray, green, yellow } from 'colorette';
import { writeFileSync } from 'fs';
import { checkForDeprecatedOptions } from '../utils';

export type BundleOptions = {
  apis?: string[];
  'max-problems'?: number;
  extends?: string[];
  config?: string;
  format?: OutputFormat;
  output?: string;
  ext: OutputExtensions;
  dereferenced?: boolean;
  force?: boolean;
  lint?: boolean;
  metafile?: string;
  'remove-unused-components'?: boolean;
  'keep-url-references'?: boolean;
} & Skips;

export async function handleBundle(argv: BundleOptions, config: Config, version: string) {
  const removeUnusedComponents =
    argv['remove-unused-components'] ||
    config.rawConfig?.styleguide?.decorators?.hasOwnProperty('remove-unused-components');
  const apis = await getFallbackApisOrExit(argv.apis, config);
  const totals: Totals = { errors: 0, warnings: 0, ignored: 0 };
  const maxProblems = argv['max-problems'];
  const deprecatedOptions: Array<keyof BundleOptions> = [
    'lint',
    'format',
    'skip-rule',
    'extends',
    'max-problems',
  ];

  checkForDeprecatedOptions(argv, deprecatedOptions);

  for (const { path, alias } of apis) {
    try {
      const startedAt = performance.now();
      const resolvedConfig = getMergedConfig(config, alias);
      const { styleguide } = resolvedConfig;

      styleguide.skipRules(argv['skip-rule']);
      styleguide.skipPreprocessors(argv['skip-preprocessor']);
      styleguide.skipDecorators(argv['skip-decorator']);

      if (argv.lint) {
        checkIfRulesetExist(styleguide.rules);
        if (config.styleguide.recommendedFallback) {
          process.stderr.write(
            `No configurations were provided -- using built in ${blue(
              'recommended'
            )} configuration by default.\n\n`
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
          maxProblems: maxProblems,
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
        keepUrlRefs: argv['keep-url-references'],
      });

      const fileTotals = getTotals(problems);
      const { outputFile, ext } = getOutputFileName(path, apis.length, argv.output, argv.ext);

      if (fileTotals.errors === 0 || argv.force) {
        if (!argv.output) {
          const output = dumpBundle(
            sortTopLevelKeysForOas(result.parsed),
            argv.ext || 'yaml',
            argv.dereferenced
          );
          process.stdout.write(output);
        } else {
          const output = dumpBundle(sortTopLevelKeysForOas(result.parsed), ext, argv.dereferenced);
          saveBundle(outputFile, output);
        }
      }

      totals.errors += fileTotals.errors;
      totals.warnings += fileTotals.warnings;
      totals.ignored += fileTotals.ignored;

      formatProblems(problems, {
        format: argv.format || 'codeframe',
        maxProblems: maxProblems,
        totals: fileTotals,
        version,
      });

      if (argv.metafile) {
        if (apis.length > 1) {
          process.stderr.write(
            yellow(`[WARNING] "--metafile" cannot be used with multiple apis. Skipping...`)
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
              elapsed
            )}.\n${yellow('Errors ignored because of --force')}.\n`
          );
        } else {
          process.stderr.write(
            `❌ Errors encountered while bundling ${blue(
              path
            )}: bundle not created (use --force to ignore errors).\n`
          );
        }
      } else {
        process.stderr.write(
          `📦 Created a bundle for ${blue(path)} at ${blue(outputFile)} ${green(elapsed)}.\n`
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

  printUnusedWarnings(config.styleguide);

  if (!(totals.errors === 0 || argv.force)) {
    throw new Error('Bundle failed.');
  }
}
