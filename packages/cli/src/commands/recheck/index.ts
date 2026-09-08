import { detectSpec, logger, parseYaml } from '@redocly/openapi-core';
import {
  generateBaseline,
  generateMarkdocSchema,
  resolveRecheckConfig,
  runLint,
  runReadability,
  type LintOptions,
  type Logger,
  type ResolvedRecheckConfig,
} from '@redocly/recheck';
import { readFileSync, statSync } from 'node:fs';
import { dirname, extname } from 'node:path';

import { AbortFlowError } from '../../utils/error.js';
import type { CommandArgs } from '../../wrapper.js';
import { selectAction, type RecheckAction, type RecheckArgv } from './args.js';

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
    excludeRules: argv['skip-rule'],
    stats: argv.stats,
    fix: argv.fix,
    annotationsLimit: argv['max-problems'],
    summary: argv.summary,
    summaryPath: argv['summary-path'],
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

  const exitCode = await runAction(selected.action, argv, resolved.config, engineLogger);
  if (exitCode !== 0) throw new AbortFlowError('Recheck failed.');
}

async function runAction(
  action: Exclude<RecheckAction, 'markdoc-schema'>,
  argv: RecheckArgv,
  resolved: ResolvedRecheckConfig,
  engineLogger: Logger
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
      },
      engineLogger
    );
  }
  if (action === 'baseline') return generateBaseline(roots, resolved, engineLogger);
  return runLint(roots, resolved, lintOptions(argv), engineLogger);
}
