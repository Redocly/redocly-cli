import {
  Config,
  formatProblems,
  getTotals,
  lint,
  lintConfig,
  findConfig,
  getMergedConfig,
  OutputFormat,
  makeDocumentFromString,
  NormalizedProblem,
  loadConfig,
  stringifyYaml,
  RawConfig,
  RuleSeverity,
  ProblemSeverity
} from '@redocly/openapi-core';
import {
  getExecutionTime,
  getFallbackEntryPointsOrExit,
  handleError,
  pluralize,
  printLintTotals,
  printConfigLintTotals,
  printUnusedWarnings,
  relativeFilePath,
} from '../utils';
import { Totals } from '../types';
import { blue, gray, red } from 'colorette';
import { performance } from 'perf_hooks';

export type LintOptions = {
  entrypoints: string[];
  'max-problems'?: number;
  'generate-ignore-file'?: boolean;
  'skip-rule'?: string[];
  'skip-preprocessor'?: string[];
  'lint-config': RuleSeverity;
  extends?: string[];
  config?: string;
  format: OutputFormat;
};

export async function handleLint(argv: LintOptions, version: string) {
  const config: Config = await loadConfig(
    argv.config,
    argv.extends,
    lintConfigCallback(argv, version),
  );

  const entrypoints = await getFallbackEntryPointsOrExit(argv.entrypoints, config);

  if (argv['generate-ignore-file']) {
    config.lint.ignore = {}; // clear ignore
  }
  const totals: Totals = { errors: 0, warnings: 0, ignored: 0 };
  let totalIgnored = 0;

  // TODO: use shared externalRef resolver, blocked by preprocessors now as they can mutate documents
  for (const { path, alias } of entrypoints) {
    try {
      const startedAt = performance.now();
      const resolvedConfig = getMergedConfig(config, alias);
      resolvedConfig.lint.skipRules(argv['skip-rule']);
      resolvedConfig.lint.skipPreprocessors(argv['skip-preprocessor']);

      if (resolvedConfig.lint.recommendedFallback) {
        process.stderr.write(
          `No configurations were defined in extends -- using built in ${blue(
            'recommended',
          )} configuration by default.\n${red(
            'Warning! This default behavior is going to be deprecated soon.',
          )}\n\n`,
        );
      }
      process.stderr.write(gray(`validating ${relativeFilePath(path)}...\n`));
      const results = await lint({
        ref: path,
        config: resolvedConfig,
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
      printValidatingFile(path, elapsed);
    } catch (e) {
      totals.errors++;
      handleError(e, path);
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
  process.once('exit', () =>
    process.exit(totals.errors === 0 || argv['generate-ignore-file'] ? 0 : 1),
  );
}

function lintConfigCallback(argv: LintOptions, version: string) {
  if (argv['lint-config'] === 'off') {
    return;
  }

  return async (config: RawConfig) => {
    const configPath = findConfig(argv.config) || '';
    const stringYaml = stringifyYaml(config);
    const configContent = makeDocumentFromString(stringYaml, configPath);
    const problems = await lintConfig({
      document: configContent,
      severity: argv['lint-config'] as ProblemSeverity,
    });
    await validateLintConfig({
      problems,
      outputFormat: argv.format,
      maxProblems: argv['max-problems'],
      version,
    });
  };
}

async function validateLintConfig({
  problems,
  outputFormat,
  maxProblems,
  version,
}: {
  problems: NormalizedProblem[];
  outputFormat: OutputFormat;
  maxProblems?: number;
  version: string;
}): Promise<void> {
  const fileTotals = getTotals(problems);

  formatProblems(problems, {
    format: outputFormat,
    maxProblems,
    totals: fileTotals,
    version,
  });
  printConfigLintTotals(fileTotals);
}

function printValidatingFile(filePath: string, validationDuration: number | string): void {
  process.stderr.write(
    gray(`${relativeFilePath(filePath)}: validated in ${validationDuration}\n\n`),
  );
}
