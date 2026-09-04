import { detectSpec, isAbsoluteUrl, parseYaml, type Config } from '@redocly/openapi-core';
import {
  generateBaseline,
  generateMarkdocSchema,
  resolveRecheckConfig,
  runLint,
  runReadability,
  type EmbeddedInput,
  type LintOptions,
  type Logger,
  type Problem,
  type ResolvedRecheckConfig,
} from '@redocly/recheck';
import { readFileSync, statSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';

import type { CommandArgs } from '../../wrapper.js';
import { selectAction, type RecheckAction, type RecheckArgv } from './args.js';
import { createCliLogger } from './cli-logger.js';
import { collectDescriptions } from './descriptions.js';
import { createPositionMapper } from './positions.js';

const DEFAULT_PRESET = 'recheck/markdown';
const API_EXTENSIONS = new Set(['.yaml', '.yml', '.json']);

// An API description is a YAML or JSON file whose root parses as a known spec.
function isApiDescription(path: string): boolean {
  if (!API_EXTENSIONS.has(extname(path).toLowerCase())) return false;
  try {
    if (!statSync(path).isFile()) return false;
    detectSpec(parseYaml(readFileSync(path, 'utf8')));
    return true;
  } catch {
    return false;
  }
}

function lintOptions(argv: RecheckArgv): LintOptions {
  return {
    format: argv.format,
    outputPath: argv['output-path'],
    severity: argv.severity,
    tags: argv.tags,
    rules: argv.rule,
    excludeRules: argv['exclude-rule'],
    stats: argv.stats,
    fix: argv.fix,
    annotationsLimit: argv['annotations-limit'],
    summary: argv.summary,
    summaryPath: argv['summary-path'],
    changedOnly: argv['changed-only'],
    changedListPath: argv['changed-list'],
  };
}

// APIs from the `apis` block, resolved against the config directory; remote
// roots stay out.
function configuredApiPaths(config: Config, configDir: string): string[] {
  return Object.values(config.resolvedConfig.apis ?? {})
    .map((api) => api.root)
    .filter((root): root is string => typeof root === 'string' && !isAbsoluteUrl(root))
    .map((root) => resolve(configDir, root));
}

async function collectEmbeddedInputs(
  apiPaths: string[],
  config: Config,
  engineLogger: Logger
): Promise<EmbeddedInput[]> {
  const inputs: EmbeddedInput[] = [];
  for (const apiPath of apiPaths) {
    let descriptions;
    try {
      descriptions = await collectDescriptions(apiPath, config);
    } catch (error) {
      engineLogger.warn(
        `Could not read API description ${apiPath}: ${error instanceof Error ? error.message : String(error)}`
      );
      continue;
    }
    for (const { source, pointer, text } of descriptions) {
      inputs.push({
        file: source.absoluteRef,
        pointer,
        content: text,
        mapPosition: createPositionMapper(source, pointer),
      });
    }
  }
  return inputs;
}

// True for a finding that `.redocly.lint-ignore.yaml` lists by file, rule, and pointer.
function ignoredBy(config: Config): (problem: Problem) => boolean {
  return (problem) =>
    problem.pointer !== undefined &&
    config.ignore[problem.file]?.[problem.ruleName]?.has(problem.pointer) === true;
}

export async function handleRecheck({ argv, config }: CommandArgs<RecheckArgv>): Promise<void> {
  const engineLogger = createCliLogger();
  const selected = selectAction(argv);
  if ('error' in selected) {
    engineLogger.error(selected.error);
    process.exitCode = 1;
    return;
  }

  if (selected.action === 'markdoc-schema') {
    const exitCode = await generateMarkdocSchema(
      { from: argv.from ?? [], out: argv.out ?? '', check: argv.check },
      engineLogger
    );
    if (exitCode !== 0) process.exitCode = exitCode;
    return;
  }

  const block = config.resolvedConfig.recheck;
  let presets = config.resolvedConfig.recheckExtends ?? [];
  if (block == null && presets.length === 0) {
    engineLogger.log(`No recheck configuration found; using ${DEFAULT_PRESET}.`);
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
    process.exitCode = 1;
    return;
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
  if (exitCode !== 0) process.exitCode = exitCode;
}

async function runAction(
  action: Exclude<RecheckAction, 'markdoc-schema'>,
  argv: RecheckArgv,
  resolved: ResolvedRecheckConfig,
  engineLogger: ReturnType<typeof createCliLogger>,
  config: Config,
  configDir: string
): Promise<number> {
  const explicit = argv.paths !== undefined && argv.paths.length > 0;
  const requested = explicit ? argv.paths! : ['.'];
  const roots: string[] = [];
  const apiPaths: string[] = [];
  for (const requestedPath of requested) {
    (isApiDescription(requestedPath) ? apiPaths : roots).push(requestedPath);
  }
  if (!explicit) apiPaths.push(...configuredApiPaths(config, configDir));

  if (action === 'readability') {
    if (apiPaths.length > 0) {
      engineLogger.warn(
        `Readability scores cover Markdown files only; skipped ${apiPaths.length} API description(s).`
      );
    }
    if (roots.length === 0) return 0;
    return runReadability(
      roots,
      resolved,
      {
        format: argv.format === 'json' ? 'json' : 'table',
        outputPath: argv['output-path'],
        changedOnly: argv['changed-only'],
        changedListPath: argv['changed-list'],
      },
      engineLogger
    );
  }

  const embeddedInputs = await collectEmbeddedInputs(apiPaths, config, engineLogger);
  if (roots.length === 0 && embeddedInputs.length === 0) return 0;
  if (action === 'baseline')
    return generateBaseline(roots, resolved, engineLogger, { embeddedInputs });
  return runLint(
    roots,
    resolved,
    { ...lintOptions(argv), embeddedInputs, isIgnored: ignoredBy(config) },
    engineLogger
  );
}
