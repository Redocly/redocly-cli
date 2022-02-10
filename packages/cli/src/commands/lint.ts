import {
  Config,
  formatProblems,
  getTotals,
  lint, LintConfig,
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

  // TODO: handle recommendedFallback in apis;

  if (config.lint.recommendedFallback) {
    process.stderr.write(
      `No configurations were defined in extends -- using built in ${blue(
        'recommended',
      )} configuration by default.\n\n`,
    );
  }

  function mergeLintConfigs(entrypoint: any) {
    if (!entrypoint.alias) return config;
    let mergedLint = config.apis[entrypoint.alias]?.lint || {};
    mergedLint.plugins = config.lint.plugins;
    mergedLint.doNotResolveExamples = mergedLint.doNotResolveExamples ?? config.lint.doNotResolveExamples ?? false;
    //TODO: fix types
    for (const [key, value] of Object.entries(config.rawConfig.lint as any) as any) {
      if (key === 'rules' || key === 'preprocessors' || key === 'decorators') {
        mergedLint[key] = { ...value, ...(mergedLint[key] || {}) }
      }
      if (key === 'extends') {
        mergedLint[key] = Array.from(new Set([...value, ...(mergedLint[key] || [])]));
      }
    }
    config.lint = new LintConfig(mergedLint);
    return config;
  }

  // TODO: use shared externalRef resolver, blocked by preprocessors now as they can mutate documents
  for (const entryPoint of entrypoints) {
    try {
      const startedAt = performance.now();
      process.stderr.write(gray(`validating ${entryPoint.path.replace(process.cwd(), '')}...\n`));
      const results = await lint({
        ref: entryPoint.path,
        config: mergeLintConfigs(entryPoint)
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
      process.stderr.write(gray(`${entryPoint.path.replace(process.cwd(), '')}: validated in ${elapsed}\n\n`));
    } catch (e) {
      totals.errors++;
      handleError(e, entryPoint.path);
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

  // defer process exit to allow STDOUT pipe to flush
  // see https://github.com/nodejs/node-v0.x-archive/issues/3737#issuecomment-19156072
  process.once('exit', () => process.exit(totals.errors === 0 || argv['generate-ignore-file'] ? 0 : 1));
}
