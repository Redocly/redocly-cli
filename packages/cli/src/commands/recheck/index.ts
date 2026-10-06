import {
  AbortFlowError,
  BaseResolver,
  isAbsoluteUrl,
  isPlainObject,
  isString,
  logger,
  type Config,
} from '@redocly/openapi-core';
import {
  generateBaseline,
  generateMarkdocSchema,
  resolveRecheckConfig,
  runLint,
  runReadability,
  Timer,
  type LintOptions,
  type NormalizedRule,
  type Problem,
  type ResolvedRecheckConfig,
} from '@redocly/recheck';
import { presets } from '@redocly/recheck/presets';

import { getAliasOrPath, getConfigDirectory } from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import { collectEmbeddedInputs, isApiDescription } from './descriptions.js';
import {
  printBaselineRun,
  printBaselineStart,
  printLintRun,
  printLintStart,
  printMarkdocSchemaRun,
  printReadabilityRun,
  printReadabilityStart,
  type LintPresentation,
} from './print.js';
import { selectAction } from './select-action.js';
import type { RecheckAction, RecheckArgv } from './types.js';

const DEFAULT_PRESET = 'recheck/markdown';

// A block of the wrong type is not empty, so the engine can report the error.
function isEmptyRecheckBlock(block: Config['recheck']): boolean {
  if (!isPlainObject(block)) return false;
  const { rules, ...settings } = block;
  return Object.keys(settings).length === 0 && Object.keys(rules ?? {}).length === 0;
}

// The command reads the root config only; per-API recheck settings do nothing.
// The check reads the raw config because the resolved config merges `extends` into the rules.
function warnAboutPerApiRecheck(config: Config): void {
  const raw = config.document?.parsed;
  if (!isPlainObject(raw) || !isPlainObject(raw.apis)) return;
  for (const [alias, api] of Object.entries(raw.apis)) {
    if (!isPlainObject(api)) continue;
    let hasRecheckPreset = false;
    if (Array.isArray(api.extends)) {
      for (const name of api.extends) {
        if (isString(name) && name.startsWith('recheck/')) hasRecheckPreset = true;
      }
    }
    if ('recheck' in api || hasRecheckPreset) {
      logger.warn(
        `Recheck settings under apis.${alias} are not used; the command reads the root config.\n`
      );
    }
  }
}

function toLintOptions(argv: RecheckArgv): LintOptions {
  return {
    tags: argv.tags,
    rules: argv.rule,
    excludeRules: argv['skip-rule'],
    fix: argv.fix,
  };
}

function toLintPresentation(argv: RecheckArgv): LintPresentation {
  return {
    format: argv.format ?? 'table',
    showStats: argv.stats,
    maxProblems: argv['max-problems'],
    summary: argv.summary,
    summaryPath: argv['summary-path'],
  };
}

// True for a finding that `.redocly.lint-ignore.yaml` lists by file, rule, and
// pointer. The rule key is the full name or the short name the report prints.
function ignoredBy(config: Config, rules: NormalizedRule[]): (problem: Problem) => boolean {
  const fullNameByShortName = new Map(rules.map((rule) => [rule.shortName, rule.name]));
  return (problem) => {
    const pointer = problem.pointer;
    if (pointer === undefined) return false;
    const ignoredRules = config.ignore?.[problem.file];
    if (ignoredRules === undefined) return false;
    return Object.entries(ignoredRules).some(
      ([key, pointers]) =>
        (fullNameByShortName.get(key) ?? key) === problem.ruleName && pointers.has(pointer)
    );
  };
}

export async function handleRecheck({ argv, config }: CommandArgs<RecheckArgv>): Promise<void> {
  const selected = selectAction(argv);
  if ('error' in selected) {
    logger.error(`${selected.error}\n`);
    throw new AbortFlowError('Recheck failed.');
  }

  if (selected.action === 'markdoc-schema') {
    const code = printMarkdocSchemaRun(
      await generateMarkdocSchema({
        from: argv.from ?? [],
        out: argv.output ?? '',
        check: argv.check,
      })
    );
    if (code !== 0) throw new AbortFlowError('Recheck failed.');
    return;
  }

  warnAboutPerApiRecheck(config);
  let block = config.recheck;
  if (isEmptyRecheckBlock(block)) {
    if (config.configPath) {
      logger.info(
        'No recheck configuration in redocly.yaml; nothing to check. Add a recheck/* preset to extends or a recheck block.\n'
      );
      return;
    }
    logger.info(`No redocly.yaml found; using ${DEFAULT_PRESET}.\n`);
    block = { rules: presets[DEFAULT_PRESET] };
  }
  const resolved = await resolveRecheckConfig({
    block,
    configDir: getConfigDirectory(config),
    warn: (message) => logger.warn(`${message}\n`),
  });
  if (!resolved.success) {
    logger.error('The recheck configuration is not valid:\n');
    for (const error of resolved.errors) {
      logger.error(`  ${error.path ? `${error.path}: ` : ''}${error.message}\n`);
    }
    throw new AbortFlowError('Recheck failed.');
  }

  const exitCode = await runAction(selected.action, argv, resolved.config, config);
  if (exitCode !== 0) throw new AbortFlowError('Recheck failed.');
}

async function runAction(
  action: Exclude<RecheckAction, 'markdoc-schema'>,
  argv: RecheckArgv,
  resolved: ResolvedRecheckConfig,
  config: Config
): Promise<number> {
  const resolver = new BaseResolver(config.resolve);
  const roots: string[] = [];
  const apiPaths: string[] = [];
  const requestedPaths = argv.paths ?? [];
  if (requestedPaths.length === 0) {
    roots.push('.');
    // Two aliases may share one root, which is walked once.
    for (const alias of Object.keys(config.resolvedConfig.apis ?? {})) {
      const { path } = getAliasOrPath(config, alias);
      if (!apiPaths.includes(path)) apiPaths.push(path);
    }
  } else {
    for (const requestedPath of requestedPaths) {
      // An alias from the `apis` block gives the root file of that API.
      const { path } = getAliasOrPath(config, requestedPath);
      if (isAbsoluteUrl(path) || (await isApiDescription(path, resolver))) {
        apiPaths.push(path);
      } else {
        roots.push(path);
      }
    }
  }

  if (action === 'readability') {
    if (apiPaths.length > 0) {
      logger.warn(
        `Readability scores cover Markdown files only; skipped ${apiPaths.length} API description(s).\n`
      );
    }
    if (roots.length === 0) {
      logger.info('No Markdown files to score.\n');
      return 0;
    }
    printReadabilityStart(roots);
    const result = await runReadability(roots, resolved, {});
    return printReadabilityRun(result, { format: argv.format === 'json' ? 'json' : 'table' });
  }

  const {
    inputs: embeddedInputs,
    failureCount,
    apiFiles,
    unreadableFiles,
  } = await collectEmbeddedInputs(apiPaths, config, resolver);
  const isIgnored = ignoredBy(config, resolved.rules);

  if (action === 'baseline') {
    // A baseline built from a partial set of descriptions would hide findings.
    if (failureCount > 0) {
      logger.error(
        `Baseline not written: the run could not read ${failureCount} API description(s).\n`
      );
      return 1;
    }
    printBaselineStart(roots, embeddedInputs.length);
    return printBaselineRun(await generateBaseline(roots, resolved, { embeddedInputs, isIgnored }));
  }

  const timer = new Timer();
  printLintStart(roots, embeddedInputs.length);
  const result = await runLint(roots, resolved, {
    ...toLintOptions(argv),
    embeddedInputs,
    apiFiles,
    unreadableFiles,
    isIgnored,
  });
  const exitCode = await printLintRun(result, toLintPresentation(argv), timer);
  // An API description that could not be read fails the run, even when lint found nothing.
  return failureCount > 0 && exitCode === 0 ? 1 : exitCode;
}
