import * as fs from 'fs/promises';

import { validate } from './config/validate.js';
import { needsImageMetadata, loadImageMetadata, mapLimit } from './core/files.js';
import { filterEnabledRules } from './core/rule-filters.js';
import { runRules, runRulesUntilStable, type FileInput } from './core/runner.js';
import type { MarkdocSchema } from './parser/markdoc/schema.js';
import type { Problem, RecheckConfig, NormalizedRule, Fix } from './types/index.js';

// How many files `lintFiles` reads at once. Higher values risk EMFILE on large repos.
const READ_CONCURRENCY = 16;

export { parseMarkdown, filterByTypes } from './parser/index.js';
export type { ParseOptions } from './parser/index.js';
export type { Token, TokenTree } from './parser/types.js';
export { extractScopes } from './scopes/extractor.js';
export type { ScopedSegment } from './scopes/types.js';
export { applyFixesToContent } from './core/auto-fix.js';
export type { ApplyFixesResult } from './core/auto-fix.js';
export type { Problem, Fix } from './types/problems.js';
export type { NormalizedRule, RecheckConfig, RecheckRules } from './types/rules.js';
export type { RuleSeverity } from './types/rules.js';
export type { ValidationError } from './types/validation.js';
export { resolveRecheckConfig } from './config/resolve.js';
export type {
  RecheckBlock,
  RecheckBlockInput,
  ResolvedRecheckConfig,
  ResolveResult,
} from './config/resolve.js';
// For callers that build their own `FileInput[]` and need image metadata like `lintFiles` loads.
export { needsImageMetadata, loadImageMetadata, MAX_IMAGE_REFS_PER_FILE } from './core/files.js';
// Lower-level entry points for callers that already have a `NormalizedRule[]`.
export { runRules, runRulesUntilStable } from './core/runner.js';
export type { FileInput, RunResult, RunnerOptions } from './core/runner.js';
export { computeTextStatistics, computeReadability } from './metrics/index.js';
export type { TextStatistics, ReadabilityFormula } from './metrics/index.js';
export { TECHNICAL_PROPER_NOUNS } from './data/proper-nouns.js';
export { runLint } from './actions/lint.js';
export type { LintOptions, LintRunReport, LintRunResult } from './actions/lint.js';
export type { EmbeddedInput } from './actions/embedded.js';
export { Timer } from './core/timing.js';
export { buildSummary, getBreakdownStats } from './core/summary.js';
export type { RuleBreakdown, Summary } from './types/reporting.js';
export { generateBaseline } from './actions/baseline.js';
export type { BaselineRunResult } from './actions/baseline.js';
export { runReadability } from './actions/readability.js';
export type {
  FileReadability,
  ReadabilityOptions,
  ReadabilityRunResult,
} from './actions/readability.js';
export { generateMarkdocSchema } from './actions/markdoc-schema.js';
export type { MarkdocSchemaOptions, MarkdocSchemaResult } from './actions/markdoc-schema.js';

async function normalizeConfig(
  config: RecheckConfig,
  configDir?: string,
  warn?: (message: string) => void
) {
  const result = await validate(config, { configDir, warn });
  if (!result.isValid) {
    const messages = result.errors
      .map((error) => `${error.path ? `${error.path}: ` : ''}${error.message}`)
      .join('; ');
    throw new Error(`Invalid recheck configuration: ${messages}`);
  }
  // Rules with `severity: off` must not run, so they report nothing and apply no fixes.
  // `knownRuleNames` still includes them, so references to them are not treated as unknown.
  const { enabled } = filterEnabledRules(result.rules);
  return {
    rules: enabled,
    knownRuleNames: new Set(result.rules.map((rule) => rule.name)),
    markdoc: result.markdoc.enabled,
    markdocSchema: result.markdoc.schema,
  };
}

/**
 * Lints a markdown string without reading any files.
 *
 * Rules that need file data, such as `max-image-size`, only work if you pass
 * the `metadata` yourself. `opts.warn` receives config warnings.
 */
export async function lintContent(
  content: string,
  config: RecheckConfig,
  opts?: {
    filePath?: string;
    metadata?: FileInput['metadata'];
    configDir?: string;
    warn?: (message: string) => void;
  }
): Promise<Problem[]> {
  const { rules, knownRuleNames, markdoc, markdocSchema } = await normalizeConfig(
    config,
    opts?.configDir,
    opts?.warn
  );
  const { problems } = await runRules(
    [{ path: opts?.filePath ?? 'content.md', content, metadata: opts?.metadata }],
    rules,
    { knownRuleNames, markdoc, markdocSchema }
  );
  return problems;
}

/** A file `lintFiles` could not read and therefore did not lint. */
export interface SkippedFile {
  path: string;
  /** The error message from the failed read. */
  reason: string;
}

/**
 * Lints markdown files from disk, and writes the fixes back when `opts.fix` is set.
 *
 * `config` is either a `RecheckConfig` or rules that are already validated (for
 * example from `loadConfig()`), which skips validation.
 *
 * Files that can't be read are skipped with a warning and listed in `skippedFiles`.
 *
 * `opts.root` is the folder that image paths must stay inside. Images outside it
 * are treated as missing. Defaults to `process.cwd()`.
 *
 * `opts.maxProblems` stops linting further files once that many problems are found,
 * and sets `truncated`.
 */
export async function lintFiles(
  paths: string[],
  config: RecheckConfig | NormalizedRule[],
  opts?: {
    fix?: boolean;
    root?: string;
    maxProblems?: number;
    configDir?: string;
    warn?: (message: string) => void;
  }
): Promise<{
  problems: Problem[];
  fixedFiles: Map<string, string>;
  skippedFiles: SkippedFile[];
  truncated: boolean;
  /**
   * Fixes that were not applied because they overlap another fix or would rewrite a Markdoc tag.
   */
  skippedFixes: Fix[];
}> {
  // A `NormalizedRule[]` has no Markdoc settings, so Markdoc stays off here.
  // For Markdoc support, use `resolveRecheckConfig()` and pass its result on, as `runLint` does.
  const { rules, knownRuleNames, markdoc, markdocSchema } = Array.isArray(config)
    ? {
        rules: filterEnabledRules(config).enabled,
        knownRuleNames: new Set(config.map((rule) => rule.name)),
        markdoc: false,
        markdocSchema: null as MarkdocSchema | null,
      }
    : await normalizeConfig(config, opts?.configDir, opts?.warn);
  const loadImageMeta = needsImageMetadata(rules);

  const fileResults = await mapLimit(
    paths,
    READ_CONCURRENCY,
    async (filePath): Promise<{ file: FileInput } | { skipped: SkippedFile }> => {
      let content: string;
      try {
        content = await fs.readFile(filePath, 'utf8');
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        opts?.warn?.(`recheck: could not read ${filePath}, skipping (${reason})`);
        return { skipped: { path: filePath, reason } };
      }
      const metadata = loadImageMeta
        ? await loadImageMetadata(filePath, content, opts?.root)
        : undefined;
      return { file: { path: filePath, content, metadata } };
    }
  );
  const files: FileInput[] = [];
  const skippedFiles: SkippedFile[] = [];
  for (const result of fileResults) {
    if ('file' in result) files.push(result.file);
    else skippedFiles.push(result.skipped);
  }

  // With `fix`, repeat until no more fixes apply, because one fix can create a new problem.
  const runnerOptions = { maxProblems: opts?.maxProblems, knownRuleNames, markdoc, markdocSchema };
  const result = opts?.fix
    ? await runRulesUntilStable(files, rules, runnerOptions)
    : await runRules(files, rules, runnerOptions);

  if (opts?.fix) {
    for (const [filePath, fixedContent] of result.fixedFiles) {
      await fs.writeFile(filePath, fixedContent, 'utf8');
    }
  }

  return { ...result, skippedFiles };
}
