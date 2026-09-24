import { AbortFlowError, detectSpec, logger, parseYaml } from '@redocly/openapi-core';
import {
  generateBaseline,
  generateMarkdocSchema,
  resolveRecheckConfig,
  runLint,
  runReadability,
  Timer,
  toRoots,
  type LintOptions,
  type ResolvedRecheckConfig,
} from '@redocly/recheck';
import { readFileSync, statSync } from 'node:fs';
import { dirname, extname } from 'node:path';

import type { CommandArgs } from '../../wrapper.js';
import {
  printBaselineRun,
  printLintRun,
  printLintStart,
  printMarkdocSchemaRun,
  printReadabilityRun,
  type LintPresentation,
} from './print.js';
import { selectAction } from './select-action.js';
import type { RecheckAction, RecheckArgv } from './types.js';

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
    annotationsLimit: argv['max-problems'],
    outputPath: argv['output-path'],
    summary: argv.summary,
    summaryPath: argv['summary-path'],
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
      await generateMarkdocSchema({ from: argv.from ?? [], out: argv.out ?? '', check: argv.check })
    );
    if (code !== 0) throw new AbortFlowError('Recheck failed.');
    return;
  }

  const block = config.resolvedConfig.recheck;
  let presets = config.resolvedConfig.recheckExtends ?? [];
  if (block == null && presets.length === 0) {
    if (config.configPath) {
      logger.info(
        'No recheck configuration in redocly.yaml; nothing to check. Add a recheck/* preset to extends or a recheck block.\n'
      );
      return;
    }
    logger.info(`No redocly.yaml found; using ${DEFAULT_PRESET}.\n`);
    presets = [DEFAULT_PRESET];
  }
  const configDir = dirname(config.configPath ?? 'redocly.yaml');
  const resolved = await resolveRecheckConfig({
    extends: presets,
    block,
    configDir,
    warn: (message) => logger.warn(`${message}\n`),
  });
  if (!resolved.success) {
    logger.error('The recheck configuration is not valid:\n');
    for (const error of resolved.errors) {
      logger.error(`  ${error.path ? `${error.path}: ` : ''}${error.message}\n`);
    }
    throw new AbortFlowError('Recheck failed.');
  }

  if (argv['output-path'] && argv.format !== 'json' && argv.format !== 'sarif') {
    logger.warn('--output-path applies to --format json and sarif; the report goes to stdout.\n');
  }

  const exitCode = await runAction(selected.action, argv, resolved.config);
  if (exitCode !== 0) throw new AbortFlowError('Recheck failed.');
}

async function runAction(
  action: Exclude<RecheckAction, 'markdoc-schema'>,
  argv: RecheckArgv,
  resolved: ResolvedRecheckConfig
): Promise<number> {
  const requested = argv.paths && argv.paths.length > 0 ? argv.paths : ['.'];
  const roots: string[] = [];
  for (const path of requested) {
    if (isApiDescription(path)) {
      logger.warn(`API descriptions are linted from the next release; skipped ${path}\n`);
    } else {
      roots.push(path);
    }
  }
  if (roots.length === 0) return 0;

  if (action === 'readability') {
    const result = await runReadability(roots, resolved, {});
    return printReadabilityRun(result, {
      format: argv.format === 'json' ? 'json' : 'table',
      outputPath: argv['output-path'],
    });
  }
  if (action === 'baseline') return printBaselineRun(await generateBaseline(roots, resolved));
  const timer = new Timer();
  printLintStart(toRoots(roots));
  const result = await runLint(roots, resolved, toLintOptions(argv));
  return printLintRun(result, toLintPresentation(argv), timer);
}
