import {
  Config,
  formatProblems,
  getTotals,
  lint,
  loadConfig,
  OutputFormat,
} from '@redocly/openapi-core';
import {
  getExecutionTime,
  getFallbackEntryPointsOrExit,
  handleError,
  pluralize,
  printLintTotals,
  printUnusedWarnings,
} from '../utils';
import { Totals } from '../types';
import { blue, gray } from 'colorette';
import { performance } from 'perf_hooks';

export async function handleLint(
  argv: {
    entrypoints: string[];
    'max-problems'?: number;
    'generate-ignore-file'?: boolean;
    'skip-rule'?: string[];
    'skip-preprocessor'?: string[];
    extends?: string[];
    config?: string;
    format: OutputFormat;
  },
  version: string,
) {
  const config: Config = await loadConfig(argv.config, argv.extends);
  config.lint.skipRules(argv['skip-rule']);
  config.lint.skipPreprocessors(argv['skip-preprocessor']);
  const entrypoints = await getFallbackEntryPointsOrExit(argv.entrypoints, config);
  if (argv['generate-ignore-file']) {
    config.lint.ignore = {}; // clear ignore
  }
  const totals: Totals = { errors: 0, warnings: 0, ignored: 0 };
  let totalIgnored = 0;
  if (config.lint.recommendedFallback) {
    process.stderr.write(
      `No configurations were defined in extends -- using built in ${blue(
        'recommended',
      )} configuration by default.\n\n`,
    );
  }

  // TODO: use shared externalRef resolver, blocked by preprocessors now as they can mutate documents
  for (const entryPoint of entrypoints) {
    try {
      const startedAt = performance.now();
      process.stderr.write(gray(`validating ${entryPoint.replace(process.cwd(), '')}...\n`));
      const results = await lint({
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
        formatProblems(results, {
          format: argv.format,
          maxProblems: argv['max-problems'],
          totals: fileTotals,
          version,
        });
      }

      const elapsed = getExecutionTime(startedAt);
      process.stderr.write(gray(`${entryPoint.replace(process.cwd(), '')}: validated in ${elapsed}\n\n`));
    } catch (e) {
      totals.errors++;
      handleError(e, entryPoint);
    }
  }

  if (argv['generate-ignore-file']) {
    config.lint.saveIgnore();
    process.stderr.write(
      `Generated ignore file with ${totalIgnored} ${pluralize('problem', totalIgnored)}.\n\n`,
    );
  } else {
    printLintTotals(totals, entrypoints.length);
  }

  printUnusedWarnings(config.lint);
  process.exit(totals.errors === 0 || argv['generate-ignore-file'] ? 0 : 1);
}
