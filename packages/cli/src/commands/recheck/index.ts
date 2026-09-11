import { detectSpec, isAbsoluteUrl, logger, parseYaml, type Config } from '@redocly/openapi-core';
import {
  generateBaseline,
  generateMarkdocSchema,
  resolveRecheckConfig,
  runLint,
  runReadability,
  type EmbeddedInput,
  type LintOptions,
  type Logger,
  type NormalizedRule,
  type Problem,
  type ResolvedRecheckConfig,
} from '@redocly/recheck';
import { readFileSync, statSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';

import { AbortFlowError } from '../../utils/error.js';
import type { CommandArgs } from '../../wrapper.js';
import { selectAction, type RecheckAction, type RecheckArgv } from './args.js';
import { collectDescriptions, type CollectedDescription } from './descriptions.js';
import { createPositionMapper } from './positions.js';

const DEFAULT_PRESET = 'recheck/markdown';
const API_EXTENSIONS = new Set(['.yaml', '.yml', '.json']);

// A requested path is an API description ('api'), a same-extension file that
// failed to parse as YAML/JSON ('unreadable-api'), or neither ('not-api').
// A parse failure stays an API description, not a Markdown page: the caller
// must fail the run instead of silently linting it as a page.
type ApiPathClassification = 'api' | 'unreadable-api' | 'not-api';

function classifyApiPath(path: string): ApiPathClassification {
  if (!API_EXTENSIONS.has(extname(path).toLowerCase())) return 'not-api';
  let isFile: boolean;
  try {
    isFile = statSync(path).isFile();
  } catch {
    return 'not-api';
  }
  if (!isFile) return 'not-api';
  let parsed: unknown;
  try {
    parsed = parseYaml(readFileSync(path, 'utf8'));
  } catch {
    return 'unreadable-api';
  }
  try {
    detectSpec(parsed);
  } catch {
    return 'not-api';
  }
  return 'api';
}

function lintOptions(argv: RecheckArgv): LintOptions {
  return {
    format: argv.format,
    outputPath: argv['output-path'],
    severity: argv.severity,
    tags: argv.tags,
    rules: argv.rule,
    excludeRules: argv['skip-rule'],
    stats: argv.stats,
    fix: argv.fix,
    annotationsLimit: argv['max-problems'],
    summary: argv.summary,
    summaryPath: argv['summary-path'],
  };
}

// APIs from the `apis` block, resolved against the config directory; remote
// roots stay out. Two aliases may share one root, which walks once.
function configuredApiPaths(config: Config, configDir: string): string[] {
  const paths = Object.values(config.resolvedConfig.apis ?? {})
    .map((api) => api.root)
    .filter((root): root is string => typeof root === 'string' && !isAbsoluteUrl(root))
    .map((root) => resolve(configDir, root));
  return [...new Set(paths)];
}

// A description reached through a remote `$ref` has a URL as its
// `source.absoluteRef`. Baseline keys and the changed-file filter need a
// local path, so such a description is counted and skipped.
export function toEmbeddedInputs(descriptions: CollectedDescription[]): {
  inputs: EmbeddedInput[];
  remoteSkipped: number;
} {
  const inputs: EmbeddedInput[] = [];
  let remoteSkipped = 0;
  for (const { source, pointer, text } of descriptions) {
    if (isAbsoluteUrl(source.absoluteRef)) {
      remoteSkipped++;
      continue;
    }
    inputs.push({
      file: source.absoluteRef,
      pointer,
      content: text,
      mapPosition: createPositionMapper(source, pointer),
    });
  }
  return { inputs, remoteSkipped };
}

async function collectEmbeddedInputs(
  apiPaths: string[],
  config: Config,
  engineLogger: Logger
): Promise<{ inputs: EmbeddedInput[]; failureCount: number; apiFiles: string[] }> {
  const descriptions: CollectedDescription[] = [];
  const apiFiles = new Set<string>();
  let failureCount = 0;
  // Two APIs may `$ref` the same file, so the descriptions of that file are
  // deduplicated across every API, not within one.
  const seen = new Set<string>();
  for (const apiPath of apiPaths) {
    let collected;
    try {
      collected = await collectDescriptions(apiPath, config);
    } catch (error) {
      engineLogger.error(
        `Could not read API description ${apiPath}: ${error instanceof Error ? error.message : String(error)}`
      );
      failureCount++;
      continue;
    }
    for (const file of collected.files) apiFiles.add(file);
    for (const description of collected.descriptions) {
      const key = `${description.source.absoluteRef}${description.pointer}`;
      if (seen.has(key)) continue;
      seen.add(key);
      descriptions.push(description);
    }
  }
  const { inputs, remoteSkipped } = toEmbeddedInputs(descriptions);
  if (remoteSkipped > 0) {
    engineLogger.log(
      `Skipped ${remoteSkipped} description(s) in remote $ref files; only local files are linted.`
    );
  }
  return { inputs, failureCount, apiFiles: [...apiFiles] };
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
  const engineLogger: Logger = {
    log: (line) => void logger.info(`${line}\n`),
    warn: (line) => void logger.warn(`${line}\n`),
    error: (line) => void logger.error(`${line}\n`),
    output: (line) => void logger.output(`${line}\n`),
  };
  const selected = selectAction(argv);
  if ('error' in selected) {
    engineLogger.error(selected.error);
    throw new AbortFlowError('Recheck failed.');
  }

  if (selected.action === 'markdoc-schema') {
    const exitCode = await generateMarkdocSchema(
      { from: argv.from ?? [], out: argv.out ?? '', check: argv.check },
      engineLogger
    );
    if (exitCode !== 0) throw new AbortFlowError('Recheck failed.');
    return;
  }

  const block = config.resolvedConfig.recheck;
  let presets = config.resolvedConfig.recheckExtends ?? [];
  if (block == null && presets.length === 0) {
    if (config.configPath) {
      engineLogger.log(
        'No recheck configuration in redocly.yaml; nothing to check. Add a recheck/* preset to extends or a recheck block.'
      );
      return;
    }
    engineLogger.log(`No redocly.yaml found; using ${DEFAULT_PRESET}.`);
    presets = [DEFAULT_PRESET];
  }
  const configDir = dirname(config.configPath ?? 'redocly.yaml');
  const resolved = await resolveRecheckConfig({
    extends: presets,
    block,
    configDir,
    warn: (message) => engineLogger.warn(message),
  });
  if (!resolved.success) {
    engineLogger.error('The recheck configuration is not valid:');
    for (const error of resolved.errors) {
      engineLogger.error(`  ${error.path ? `${error.path}: ` : ''}${error.message}`);
    }
    throw new AbortFlowError('Recheck failed.');
  }

  if (argv['output-path'] && argv.format !== 'json' && argv.format !== 'sarif') {
    engineLogger.warn(
      '--output-path applies to --format json and sarif; the report goes to stdout.'
    );
  }

  const exitCode = await runAction(
    selected.action,
    argv,
    resolved.config,
    engineLogger,
    config,
    configDir
  );
  if (exitCode !== 0) throw new AbortFlowError('Recheck failed.');
}

async function runAction(
  action: Exclude<RecheckAction, 'markdoc-schema'>,
  argv: RecheckArgv,
  resolved: ResolvedRecheckConfig,
  engineLogger: Logger,
  config: Config,
  configDir: string
): Promise<number> {
  const explicit = argv.paths !== undefined && argv.paths.length > 0;
  const requested = explicit ? argv.paths! : ['.'];
  const roots: string[] = [];
  const apiPaths: string[] = [];
  for (const requestedPath of requested) {
    const classification = classifyApiPath(requestedPath);
    (classification === 'not-api' ? roots : apiPaths).push(requestedPath);
  }
  if (!explicit) apiPaths.push(...configuredApiPaths(config, configDir));

  if (action === 'readability') {
    if (apiPaths.length > 0) {
      engineLogger.warn(
        `Readability scores cover Markdown files only; skipped ${apiPaths.length} API description(s).`
      );
    }
    if (roots.length === 0) {
      engineLogger.log('No Markdown files to score.');
      return 0;
    }
    return runReadability(
      roots,
      resolved,
      {
        format: argv.format === 'json' ? 'json' : 'table',
        outputPath: argv['output-path'],
      },
      engineLogger
    );
  }

  const {
    inputs: embeddedInputs,
    failureCount,
    apiFiles,
  } = await collectEmbeddedInputs(apiPaths, config, engineLogger);
  // A baseline built from a partial set of descriptions would hide findings.
  if (action === 'baseline' && failureCount > 0) {
    engineLogger.error(
      `Baseline not written: the run could not read ${failureCount} API description(s).`
    );
    return 1;
  }
  const isIgnored = ignoredBy(config, resolved.rules);
  const exitCode =
    action === 'baseline'
      ? await generateBaseline(roots, resolved, engineLogger, { embeddedInputs, isIgnored })
      : await runLint(
          roots,
          resolved,
          { ...lintOptions(argv), embeddedInputs, apiFiles, isIgnored },
          engineLogger
        );
  // An API description that failed to parse fails the gate even when the
  // lint or baseline action otherwise found nothing to report.
  return failureCount > 0 && exitCode === 0 ? 1 : exitCode;
}
