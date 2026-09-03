import { cyan, green, yellow } from 'colorette';
import * as fs from 'fs/promises';
import * as pathModule from 'path';

import type { ResolvedRecheckConfig } from '../config/resolve.js';
import { buildBaseline, serializeBaseline, baselineKeyMapper } from '../core/baseline.js';
import { needsImageMetadata, loadImageMetadata } from '../core/files.js';
import { filterEnabledRules } from '../core/rule-filters.js';
import { runRules, type FileInput } from '../core/runner.js';
import type { Logger } from './logger.js';
import { discoverFilesForRoots, toRoots } from './roots.js';

/**
 * Runs the full configured rule set and writes the baseline file: one count
 * per file per rule, errors only, sorted for stable diffs. See
 * core/baseline.ts for the format and the lint gate's semantics.
 */
export async function generateBaseline(
  paths: string | string[] = '.',
  config: ResolvedRecheckConfig,
  logger: Logger
): Promise<number> {
  const roots = toRoots(paths);
  logger.log(cyan(`📋 Building recheck baseline from: ${roots.join(', ')}`));

  const configDir = config.configDir;

  const { enabled: rulesToRun } = filterEnabledRules(config.rules);
  const files = await discoverFilesForRoots(roots);
  logger.log(`   Found ${files.length} markdown file(s)`);

  const loadImageMeta = needsImageMetadata(rulesToRun);
  const fileInputs: FileInput[] = [];
  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const metadata = loadImageMeta ? await loadImageMetadata(filePath, content) : undefined;
      fileInputs.push({ path: filePath, content, metadata });
    } catch {
      logger.log(yellow(`   Warning: Could not read file ${filePath}`));
    }
  }

  const { problems } = await runRules(fileInputs, rulesToRun, {
    knownRuleNames: new Set(config.rules.map((rule) => rule.name)),
    markdoc: config.markdoc,
    markdocSchema: config.markdocSchema,
  });

  const errors = problems.filter((problem) => problem.severity === 'error');
  const baseline = buildBaseline(errors, baselineKeyMapper(configDir));
  const outPath = config.baselinePath ?? pathModule.resolve(configDir, 'recheck-baseline.yaml');
  await fs.writeFile(outPath, serializeBaseline(baseline), 'utf8');

  const fileCount = Object.keys(baseline.files).length;
  logger.log(green(`✅ Wrote ${outPath}`));
  logger.log(`   ${errors.length} error finding(s) across ${fileCount} file(s) baselined.`);
  if (config.baselinePath === undefined) {
    logger.warn('   The recheck block has no `baseline` key, so runs ignore this file.');
    logger.warn(
      '   Add `baseline: ./recheck-baseline.yaml` to the recheck block in redocly.yaml to activate it.'
    );
  }
  return 0;
}
