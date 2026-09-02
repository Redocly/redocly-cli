import * as fs from 'fs/promises';

import { validate } from './config/validate.js';
import { needsImageMetadata, loadImageMetadata, mapLimit } from './core/files.js';
import { filterEnabledRules } from './core/rule-filters.js';
import { runRules, runRulesUntilStable, type FileInput } from './core/runner.js';
import type { MarkdocSchema } from './parser/markdoc/schema.js';
import type { Problem, RecheckConfig, NormalizedRule, Fix } from './types/index.js';

// Bound how many files lintFiles reads (and loads image metadata for)
// concurrently. High enough to saturate disk I/O on typical repos, low
// enough to avoid EMFILE on large ones.
const READ_CONCURRENCY = 16;

export { parseMarkdown, filterByTypes } from './parser/index.js';
export type { ParseOptions } from './parser/index.js';
export type { Token, TokenTree } from './parser/types.js';
export { extractScopes } from './scopes/extractor.js';
export type { ScopedSegment } from './scopes/types.js';
export { applyFixesToContent } from './core/auto-fix.js';
export type { ApplyFixesResult } from './core/auto-fix.js';
export type { Problem, Fix } from './types/problems.js';
export type { NormalizedRule, RecheckConfig } from './types/rules.js';
export type { RuleSeverity } from './types/rules.js';
export type { ValidationError } from './types/validation.js';
// Exposed so callers building their own FileInput[] (e.g. the ai-worker
// recheck tool) can populate metadata the same way lintFiles does, without
// reimplementing image-metadata loading.
export { needsImageMetadata, loadImageMetadata, MAX_IMAGE_REFS_PER_FILE } from './core/files.js';
// Lower-level engine entry point for callers that already have NormalizedRule[]
// (e.g. from `loadConfig`) and want to run against an explicit file list without
// lintFiles' own config validation/loading.
export { runRules, runRulesUntilStable } from './core/runner.js';
export type { FileInput, RunResult, RunnerOptions } from './core/runner.js';
// Text statistics + readability formulas (consumed by the `metric` assertion).
export { computeTextStatistics, computeReadability } from './metrics/index.js';
export type { TextStatistics, ReadabilityFormula } from './metrics/index.js';
// Built-in technical/product proper-noun vocabulary (see its own doc comment
// for the inclusion bar): consumed by default by `capitalization` and
// `spelling` (the `builtinVocabulary` option on each), and re-exported here
// so callers can read or extend it directly -- e.g. to build their own
// tooling around the same list, or to diff their project's `vocab`/
// `exceptions` against what's already covered for free.
export { TECHNICAL_PROPER_NOUNS } from './data/proper-nouns.js';

async function normalizeConfig(config: RecheckConfig, configDir?: string) {
  const result = await validate(config, { configDir });
  if (!result.isValid) {
    const messages = result.errors.map((error) => error.message).join('; ');
    throw new Error(`Invalid recheck configuration: ${messages}`);
  }
  // Mirror the CLI (see commands/run.ts's applyFilters): rules with
  // `severity: off` must not run at all — not produce problems, and not
  // (under fix: true) apply fixes. The pre-filter name set still goes to
  // the runner — see RunnerOptions.knownRuleNames.
  const { enabled } = filterEnabledRules(result.rules);
  return {
    rules: enabled,
    knownRuleNames: new Set(result.rules.map((rule) => rule.name)),
    markdoc: result.markdoc.enabled,
    // Threaded alongside the boolean flag so the runner can derive
    // `ctx.markdoc.pairing`'s self-closing set. `null` when no schema is
    // configured, same as `result.markdoc.schema` itself.
    markdocSchema: result.markdoc.schema,
  };
}

/**
 * Lints a single in-memory markdown string against a config, with no file I/O.
 *
 * Because there's no disk access here, rules that depend on on-disk facts
 * (e.g. `max-image-size`, which needs image byte size) can't resolve that
 * data themselves. Callers who need those rules to fire must supply the
 * relevant `metadata` up front; `lintFiles` does this automatically since it
 * reads from disk.
 */
export async function lintContent(
  content: string,
  config: RecheckConfig,
  opts?: { filePath?: string; metadata?: FileInput['metadata']; configDir?: string }
): Promise<Problem[]> {
  const { rules, knownRuleNames, markdoc, markdocSchema } = await normalizeConfig(
    config,
    opts?.configDir
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
  /** Why the read failed (the underlying error's message, e.g. EACCES/ENOENT). */
  reason: string;
}

/**
 * Lints markdown files from disk, optionally writing auto-fixes back.
 *
 * `config` accepts either a raw `RecheckConfig` (validated and normalized
 * here via `validate()`) or an already-normalized `NormalizedRule[]` — e.g.
 * from `loadConfig()` — for callers that have their own config-loading step
 * and just want to run the engine against a file list. Passing an array
 * skips validation, since the rules are assumed already validated.
 *
 * Unreadable files are warned about and skipped rather than failing the
 * whole call — one bad path (permissions, race with a delete, etc.)
 * shouldn't take down linting for the rest of the batch. Every skipped
 * file is also reported in the returned `skippedFiles` (path + reason), so
 * callers that must know their coverage was incomplete — a security review
 * consuming lint results, say — get a programmatic signal, not just a
 * console warning. Reads (and any image-metadata loading) run with bounded
 * concurrency via `mapLimit`.
 *
 * `opts.root` is the lint root that image-metadata loading is confined to
 * (see `loadImageMetadata`): image refs resolving outside it — lexically or
 * physically, via a symlink planted inside the root — are treated as
 * missing without leaking the target's existence or size. Defaults to
 * `process.cwd()`; pass it explicitly when the linted files live elsewhere
 * (e.g. a checked-out repo under a temp dir).
 *
 * `opts.maxProblems` caps how many problems the run may collect (see
 * `RunnerOptions.maxProblems`): once a file's lint reaches the cap, later
 * files aren't linted at all and the returned `truncated` flag is true, so
 * memory stays bounded on pathological inputs.
 */
export async function lintFiles(
  paths: string[],
  config: RecheckConfig | NormalizedRule[],
  opts?: { fix?: boolean; root?: string; maxProblems?: number; configDir?: string }
): Promise<{
  problems: Problem[];
  fixedFiles: Map<string, string>;
  skippedFiles: SkippedFile[];
  truncated: boolean;
  /**
   * Proposed fixes that never landed: overlapping edits, plus fixes withheld to
   * avoid rewriting a Markdoc tag. Already present at runtime via
   * `{ ...result, skippedFiles }` below; declared here so typed callers can see
   * it.
   */
  skippedFixes: Fix[];
}> {
  // A `NormalizedRule[]` caller has already gone through validate() upstream,
  // so there is no config here to read a `markdoc` flag from and it stays
  // disabled for this overload. That is by construction, not an omission: a
  // bare `NormalizedRule[]` has nowhere to carry a `markdoc`/`markdocSchema`
  // pair. A caller that wants Markdoc rules and fix protection should call
  // `loadConfig()`/`findAndLoadConfig()` and thread the resulting `LoadResult`
  // through directly, as the CLI's `runCommand` does.
  const { rules, knownRuleNames, markdoc, markdocSchema } = Array.isArray(config)
    ? {
        rules: filterEnabledRules(config).enabled,
        knownRuleNames: new Set(config.map((rule) => rule.name)),
        markdoc: false,
        markdocSchema: null as MarkdocSchema | null,
      }
    : await normalizeConfig(config, opts?.configDir);
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
        // oxlint-disable-next-line eslint/no-console -- immediate diagnostic breadcrumb alongside the returned `skippedFiles` signal; see lint-files.test.ts's dedicated regression test for both.
        console.warn(`recheck: could not read ${filePath}, skipping (${reason})`);
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

  // Under fix:true, loop lint → apply fixes → re-lint until a pass produces
  // zero fixes (capped) so callers get a fully-converged file from a single
  // lintFiles() call — see runRulesUntilStable for why a single
  // runRules() pass isn't always enough (e.g. a whole-line fix from one
  // rule can leave behind an issue another rule already fixed this pass).
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
