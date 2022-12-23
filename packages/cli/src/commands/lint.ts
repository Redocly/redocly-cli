import {
  Config,
  formatProblems,
  getTotals,
  lint,
  lintConfig,
  findConfig,
  getMergedConfig,
  makeDocumentFromString,
  stringifyYaml,
  RawConfig,
  RuleSeverity,
  ProblemSeverity,
  doesYamlFileExist,
} from '@redocly/openapi-core';
import {
  getExecutionTime,
  getFallbackApisOrExit,
  handleError,
  pluralize,
  printLintTotals,
  printConfigLintTotals,
  printUnusedWarnings,
  exitWithError,
  loadConfigAndHandleErrors,
} from '../utils';
import type { CommonOptions, Skips, Totals } from '../types';
import { blue, gray } from 'colorette';
import { performance } from 'perf_hooks';

export type LintOptions = CommonOptions &
  Omit<Skips, 'skip-decorator'> & {
    'generate-ignore-file'?: boolean;
    'lint-config': RuleSeverity;
  };

export async function handleLint(argv: LintOptions, version: string) {
  if (argv.config && !doesYamlFileExist(argv.config)) {
    return exitWithError('Please, provide valid path to the configuration file');
  }

  const config: Config = await loadConfigAndHandleErrors({
    configPath: argv.config,
    customExtends: argv.extends,
    processRawConfig: lintConfigCallback(argv, version),
  });

  const apis = await getFallbackApisOrExit(argv.apis, config);

  if (argv['generate-ignore-file']) {
    config.styleguide.ignore = {}; // clear ignore
  }
  const totals: Totals = { errors: 0, warnings: 0, ignored: 0 };
  let totalIgnored = 0;

  // TODO: use shared externalRef resolver, blocked by preprocessors now as they can mutate documents
  for (const { path, alias } of apis) {
    try {
      const startedAt = performance.now();
      const resolvedConfig = getMergedConfig(config, alias);
      const { styleguide } = resolvedConfig;

      styleguide.skipRules(argv['skip-rule']);
      styleguide.skipPreprocessors(argv['skip-preprocessor']);

      if (styleguide.recommendedFallback) {
        process.stderr.write(
          `No configurations were provided -- using built in ${blue(
            'recommended'
          )} configuration by default.\n\n`
        );
      }
      process.stderr.write(gray(`validating ${path.replace(process.cwd(), '')}...\n`));
      const results = await lint({
        ref: path,
        config: resolvedConfig,
      });

      const fileTotals = getTotals(results);
      totals.errors += fileTotals.errors;
      totals.warnings += fileTotals.warnings;
      totals.ignored += fileTotals.ignored;

      if (argv['generate-ignore-file']) {
        for (const m of results) {
          config.styleguide.addIgnore(m);
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
      process.stderr.write(gray(`${path.replace(process.cwd(), '')}: validated in ${elapsed}\n\n`));
    } catch (e) {
      handleError(e, path);
    }
  }

  if (argv['generate-ignore-file']) {
    config.styleguide.saveIgnore();
    process.stderr.write(
      `Generated ignore file with ${totalIgnored} ${pluralize('problem', totalIgnored)}.\n\n`
    );
  } else {
    printLintTotals(totals, apis.length);
  }

  printUnusedWarnings(config.styleguide);

  // defer process exit to allow STDOUT pipe to flush
  // see https://github.com/nodejs/node-v0.x-archive/issues/3737#issuecomment-19156072
  process.once('exit', () =>
    process.exit(totals.errors === 0 || argv['generate-ignore-file'] ? 0 : 1)
  );
}

function lintConfigCallback(argv: LintOptions, version: string) {
  if (argv['lint-config'] === 'off') {
    return;
  }

  if (argv.format === 'json') {
    // we can't print config lint results as it will break json output
    return;
  }

  return async (config: RawConfig) => {
    const { 'max-problems': maxProblems, format } = argv;
    const configPath = findConfig(argv.config) || '';
    const stringYaml = stringifyYaml(config);
    const configContent = makeDocumentFromString(stringYaml, configPath);
    const problems = await lintConfig({
      document: configContent,
      severity: argv['lint-config'] as ProblemSeverity,
    });

    const fileTotals = getTotals(problems);

    formatProblems(problems, {
      format,
      maxProblems,
      totals: fileTotals,
      version,
    });

    printConfigLintTotals(fileTotals);
  };
}
