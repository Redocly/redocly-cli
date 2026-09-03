import { detectSpec, parseYaml } from '@redocly/openapi-core';
import {
  generateBaseline,
  generateMarkdocSchema,
  resolveRecheckConfig,
  runLint,
  runReadability,
  type LintOptions,
  type ResolvedRecheckConfig,
} from '@redocly/recheck';
import { readFileSync, statSync } from 'node:fs';
import { dirname, extname } from 'node:path';

import type { CommandArgs } from '../../wrapper.js';
import { selectAction, type RecheckAction, type RecheckArgv } from './args.js';
import { createCliLogger } from './cli-logger.js';

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

  const exitCode = await runAction(selected.action, argv, resolved.config, engineLogger);
  if (exitCode !== 0) process.exitCode = exitCode;
}

async function runAction(
  action: Exclude<RecheckAction, 'markdoc-schema'>,
  argv: RecheckArgv,
  resolved: ResolvedRecheckConfig,
  engineLogger: ReturnType<typeof createCliLogger>
): Promise<number> {
  const requested = argv.paths && argv.paths.length > 0 ? argv.paths : ['.'];
  const roots: string[] = [];
  for (const path of requested) {
    if (isApiDescription(path)) {
      engineLogger.warn(`API descriptions are linted from the next release; skipped ${path}`);
    } else {
      roots.push(path);
    }
  }
  if (roots.length === 0) return 0;

  if (action === 'readability') {
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
  if (action === 'baseline') return generateBaseline(roots, resolved, engineLogger);
  return runLint(roots, resolved, lintOptions(argv), engineLogger);
}
