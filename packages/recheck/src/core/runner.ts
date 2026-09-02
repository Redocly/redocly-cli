import { parseMarkdown } from '../parser/index.js';
import { computeMarkdocPairing, emptyMarkdocPairing } from '../parser/markdoc/pairing.js';
import { selfClosingTagNames, type MarkdocSchema } from '../parser/markdoc/schema.js';
import { resolveAssertion } from '../rules/registry.js';
import { clearHtmlCommentText } from '../rules/token/helpers.js';
import { formatTokenMessage } from '../rules/token/messages.js';
import type { ScopeRuleContext, TokenRuleContext } from '../rules/types.js';
import { shouldProcessFile, shouldSkipLine } from '../rules/utils.js';
import { extractScopes } from '../scopes/extractor.js';
import { compileSelector } from '../scopes/selector.js';
import type { ScopedSegment } from '../scopes/types.js';
import type { NormalizedRule, Problem, Fix } from '../types/index.js';
import { applyFixesToContent } from './auto-fix.js';
import { parseDirectives } from './directives.js';
import { newLineRe } from './line-endings.js';
import { markdocTagSpans, protectMarkdocTags, type MarkdocTagSpan } from './markdoc-tags.js';

// Rules embedded markdown cannot support: they assert whole-document
// shape, or resolve anchors embedded content does not carry (document-level
// and renderer-generated ones such as Redoc's `#section/...` deep links).
const EMBEDDED_UNSUPPORTED_RULES = new Set([
  'single-h1',
  'first-line-h1',
  'front-matter',
  'single-trailing-newline',
  'link-fragments',
]);

export interface RunnerOptions {
  fix?: boolean;
  /**
   * Lint each input as embedded markdown rather than a whole document:
   * a leading `---` parses as content instead of front matter, and
   * EMBEDDED_UNSUPPORTED_RULES drop from the run, even when configured.
   */
  embedded?: boolean;
  /**
   * Cap on the total problems a run may collect, enforced BETWEEN files:
   * once a file's lint pushes the total to (or past) the cap, that file's
   * overflow is truncated and NO further file is linted at all — so a
   * pathological input set can't ballon memory past cap + one file's worth
   * of problems. Runs that hit the cap report `truncated: true` on their
   * RunResult. Omit for unbounded collection (the default).
   */
  maxProblems?: number;
  /**
   * FULL set of configured rule names, used only to decide which inline
   * directive names get an "unknown rule" warning (see core/directives.ts).
   * Callers filter `severity: off` rules out of `rules` before runRules, so
   * without this a directive suppressing an off-rule — a deliberate no-op,
   * not a typo — would warn as unknown. Defaults to the names of `rules`
   * (correct for callers that never pre-filter).
   */
  knownRuleNames?: Set<string>;
  /**
   * Opt-in Markdoc tokenization, passed through to every `parseMarkdown` call
   * this run makes. Defaults to disabled, matching `parseMarkdown`'s own
   * default, which leaves the parse byte-identical.
   */
  markdoc?: boolean;
  /**
   * The resolved schema used to derive `ctx.markdoc.pairing`'s self-closing
   * set; only meaningful alongside `markdoc: true`. `null` or omitted means no
   * schema: parsing and pairing still run, every rule reading
   * `ctx.markdoc.schema` sees `null`, and no tag name counts as self-closing,
   * so an unclosed one lands in `pairing.unclosed` rather than
   * `voidMissingSlash`.
   */
  markdocSchema?: MarkdocSchema | null;
}

export interface FileInput {
  path: string;
  content: string;
  metadata?: ScopeRuleContext['fileMetadata'];
}

export interface RunResult {
  problems: Problem[];
  fixedFiles: Map<string, string>;
  /**
   * Flat list of the fixes that GENUINELY landed in `fixedFiles`, for
   * reporting. Proposed fixes dropped by the applier's overlap resolution
   * are NOT here — they're in `skippedFixes` (see applyFixesToContent's
   * applied/skipped classification).
   */
  fixes: Fix[];
  /**
   * Proposed fixes that could not be applied (overlapping edits,
   * out-of-range lines). For runRulesUntilStable this holds only the fixes
   * still pending after the final pass — a fix skipped in one pass but
   * re-proposed and applied in a later pass is (correctly) reported in
   * `fixes` instead.
   */
  skippedFixes: Fix[];
  /**
   * True when `RunnerOptions.maxProblems` cut the run short: problems were
   * dropped past the cap and/or later files were never linted. Always false
   * for uncapped runs, and for capped runs whose problem count never
   * exceeded the cap with files left over.
   */
  truncated: boolean;
}

function wholeFileSegment(content: string): ScopedSegment {
  const lines = content.split(newLineRe);
  return {
    scope: 'all',
    content,
    startLine: 1,
    startColumn: 1,
    endLine: lines.length,
    endColumn: (lines[lines.length - 1]?.length ?? 0) + 1,
    tokens: [],
  };
}

/**
 * Returns a stateful filter that drops exact duplicate SCOPE-rule findings
 * — same rule, file, position, and message — keeping the first occurrence
 * so ordering stays otherwise stable.
 *
 * Overlapping scope segments make duplicates legitimate scope-rule output:
 * extractScopes emits paragraph + summary + sentence segments over the
 * same source span, so a selector matching several of those kinds (a
 * negation like `~code` matches every non-excluded segment; a plain array
 * can mix overlapping kinds like `[paragraph, sentence]`) hands a scope
 * rule the same text once per segment and one underlying match gets
 * reported once per segment. Same-position findings whose MESSAGES differ
 * (e.g. a pattern token matching more text in the paragraph segment than
 * in its sentence sub-segment) are genuinely distinct reports and all
 * survive.
 *
 * TOKEN-rule findings are exempt on purpose: upstream markdownlint can
 * genuinely report the same (rule, file, line, column, message) twice —
 * MD032/blanks-around-lists emits its blank-above error and its
 * blank-below error both AT a single-line list's only line when neither
 * neighbor is blank — and the parity harness counts those doubles, so
 * deduping them would break markdownlint parity (51 MD032 findings lost
 * over the monorepo-docs corpus).
 *
 * Fix proposals need no deduplication here — applyFixesToContent's own
 * duplicate/collapse steps already drop identical edits. O(n) via a Set
 * of NUL-joined identity keys (NUL cannot appear in any key field, so
 * keys never collide across field boundaries).
 */
function createFindingDeduper(): (problem: Problem) => boolean {
  const seen = new Set<string>();
  return (problem) => {
    const key = [
      problem.ruleName,
      problem.file,
      problem.line,
      problem.column,
      problem.message,
    ].join('\u0000');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };
}

function internalError(file: string, ruleName: string, error: unknown): Problem {
  const message = error instanceof Error ? error.message : String(error);
  return {
    file,
    line: 1,
    column: 1,
    text: '',
    match: '',
    ruleName: 'recheck/internal-error',
    severity: 'warn',
    message: `Rule ${ruleName} failed: ${message}`,
  };
}

// oxlint-disable-next-line sonarjs/cognitive-complexity -- ported from the source engine, written and reviewed against that repo's threshold of 100 (this repo's default is 30); needs a dedicated refactor or a per-package override, not a same-task rewrite of correctness-critical rule logic.
export async function runRules(
  files: FileInput[],
  rules: NormalizedRule[],
  options: RunnerOptions = {}
): Promise<RunResult> {
  if (options.embedded === true) {
    rules = rules.filter((rule) => !EMBEDDED_UNSUPPORTED_RULES.has(rule.shortName));
  }
  const problems: Problem[] = [];
  const fixesByFile = new Map<string, Fix[]>();
  // Per-file markdoc tag spans, collected while each file's tree is still
  // in hand and consumed once by the fix pass below. Only populated for a
  // fixing run — nothing else needs them.
  const tagSpansByFile = new Map<string, MarkdocTagSpan[]>();
  // Scope-rule findings dedup here — in runRules, where every entry point's
  // problems converge (lintFiles, lintContent, the CLI run/validate
  // commands, and runRulesUntilStable's first pass all flow through
  // runRules) — so no caller sees inflated duplicates from overlapping
  // scope segments.
  const isFirstOccurrence = createFindingDeduper();

  const selectors = new Map(rules.map((rule) => [rule.name, compileSelector(rule.scope)]));
  const knownRuleNames = options.knownRuleNames ?? new Set(rules.map((r) => r.name));

  // Perf: extractScopes() walks the whole tree building every scope's
  // segment list, but that work is entirely wasted when every configured
  // rule resolves to a TOKEN rule (which reads `tree`/`lines` directly and
  // never touches `ctx.segments`) -- a common shape for a markdownlint-
  // parity-only config. Resolving each rule's assertion kind doesn't depend
  // on file content, so this only needs to run once, up front, rather than
  // per file.
  const hasScopeRules = rules.some((rule) =>
    Object.keys(rule.assertions).some((assertionId) => {
      try {
        return resolveAssertion(assertionId).kind === 'scope';
      } catch {
        return false;
      }
    })
  );

  // Same shape as `hasScopeRules` above and for the same reason:
  // `computeMarkdocPairing` walks every `markdocTag` token maintaining a
  // nesting stack, and that work is wasted when no active rule can read
  // `ctx.markdoc.pairing`. The `markdoc` tag is the marker every pairing- or
  // schema-aware rule carries, and assertion resolution doesn't depend on file
  // content, so this is one pass over the config up front rather than per
  // file. Only the pairing computation is skipped — `ctx.markdoc` is still
  // provided whenever the flag is on, so a rule that only reads
  // `ctx.markdoc.schema` is unaffected.
  const hasMarkdocRules = rules.some((rule) =>
    Object.keys(rule.assertions).some((assertionId) => {
      try {
        const resolved = resolveAssertion(assertionId);
        return resolved.kind === 'token' && resolved.rule.tags.includes('markdoc');
      } catch {
        return false;
      }
    })
  );

  // The schema and its self-closing set don't vary per file, so they are
  // resolved once here rather than inside the loop and handed to rules on
  // `ctx.markdoc`, so no rule re-derives the set for every file.
  const markdocSchema = options.markdocSchema ?? null;
  const markdocSelfClosingTags = markdocSchema
    ? selfClosingTagNames(markdocSchema)
    : (new Set<string>() as ReadonlySet<string>);

  let truncated = false;

  for (const { path, content, metadata } of files) {
    // Enforced BETWEEN files (see RunnerOptions.maxProblems): at the cap,
    // remaining files are never parsed or linted, so memory stays bounded
    // by the cap plus a single file's worth of problems.
    if (options.maxProblems !== undefined && problems.length >= options.maxProblems) {
      truncated = true;
      break;
    }
    const tree = parseMarkdown(content, {
      markdoc: options.markdoc === true,
      embedded: options.embedded === true,
    });
    // Unknown-rule-name warnings surface even on a file-disabled file: they
    // flag a typo in the directive itself, not a suppressed rule finding.
    const directives = parseDirectives(tree, path, knownRuleNames);
    problems.push(...directives.warnings);
    if (directives.fileDisabled) continue;
    if (options.fix) tagSpansByFile.set(path, markdocTagSpans(tree, content));
    const allSegments = hasScopeRules ? extractScopes(tree, content) : [];
    // newLineRe (not '\n'): CRLF files must yield ending-free lines here —
    // token rules index into ctx.lines assuming exactly what upstream
    // markdownlint gives them (newLineRe-split lines with no '\r' left on).
    const fileLines = content.split(newLineRe);
    // Matches upstream markdownlint's own pipeline -- it runs
    // `clearHtmlCommentText` once, globally, before splitting into
    // `params.lines` (see clearHtmlCommentText's doc comment). Token
    // rules that scan `ctx.lines` by index (MD009/no-trailing-spaces,
    // MD010/no-hard-tabs, MD011/no-reversed-links, MD012/no-multiple-
    // blanks, etc.) get this cleared text instead of the raw file, so
    // whitespace/content INSIDE an HTML comment is never mistaken for
    // real document content. Line/column positions are identical to the
    // raw file (the transform only substitutes characters, never
    // inserts/removes any, and never touches `\r`/`\n`), so `fileLines`
    // (raw) is still exactly what's needed for `Problem.text`/error
    // context construction and for `shouldSkipLine`'s exception-comment
    // matching below -- only token rules' internal scanning logic reads
    // the cleared version.
    const commentClearedLines = clearHtmlCommentText(content).split(newLineRe);
    // `ctx.markdoc`, computed once per file like `commentClearedLines` above.
    // Left undefined rather than empty when markdoc parsing is off, so a rule
    // can bail with `if (!ctx.markdoc) return;` instead of having to tell
    // "off" apart from "on, with nothing to report".
    const markdocCtx =
      options.markdoc === true
        ? {
            schema: markdocSchema,
            selfClosingTags: markdocSelfClosingTags,
            pairing: hasMarkdocRules
              ? computeMarkdocPairing(tree, { selfClosingTags: markdocSelfClosingTags })
              : emptyMarkdocPairing(),
          }
        : undefined;

    for (const rule of rules) {
      if (!shouldProcessFile(path, rule)) continue;
      const selector = selectors.get(rule.name) ?? null;
      const lineExcepted = (line: number) => shouldSkipLine(fileLines[line - 1] ?? '', rule);
      const problemAllowed = (line: number) =>
        !lineExcepted(line) && !directives.isSuppressed(rule.name, line);
      // Lazy + cached per rule: a rule whose assertions are ALL token-kind
      // never needs its scope segments filtered at all, and a rule with
      // more than one scope-kind assertion only needs the filter computed
      // once (the result is identical across that rule's own assertions).
      let segments: ScopedSegment[] | null = null;

      for (const assertionId of Object.keys(rule.assertions)) {
        let resolved;
        try {
          resolved = resolveAssertion(assertionId);
        } catch (error) {
          problems.push(internalError(path, rule.name, error));
          continue;
        }

        if (resolved.kind === 'scope') {
          if (segments === null) {
            segments = selector ? allSegments.filter(selector) : [wholeFileSegment(content)];
          }
          const scopeRule = resolved.rule;
          const ctx = { segments, content, tree, fileMetadata: metadata };
          // Same predicate the fix branch below uses, minus `options.fix`, so
          // a plain run can say which findings `--fix` would have rewritten.
          // A rule that sets `fixable` per problem can only narrow it: a
          // detection-only site (capitalization's custom-regex mode, a
          // consistency pair with different word counts) stays unmarked even
          // though the rule as a whole can fix.
          const canFix = Boolean(scopeRule.fixable && scopeRule.fix && rule.fix !== false);
          try {
            const ruleProblems = await scopeRule.execute(rule, path, ctx);
            problems.push(
              ...ruleProblems
                .filter((problem) => problemAllowed(problem.line))
                .filter(isFirstOccurrence)
                .map((problem) => ({ ...problem, fixable: canFix && (problem.fixable ?? true) }))
            );
            if (options.fix && scopeRule.fixable && scopeRule.fix && rule.fix !== false) {
              const ruleFixes = await scopeRule.fix(rule, path, ctx);
              const fileFixes = fixesByFile.get(path) ?? [];
              fileFixes.push(...ruleFixes.filter((fix) => problemAllowed(fix.lineNumber)));
              fixesByFile.set(path, fileFixes);
            }
          } catch (error) {
            problems.push(internalError(path, rule.name, error));
          }
          continue;
        }

        const tokenRule = resolved.rule;
        const tokenProblems: Problem[] = [];
        const tokenFixes: Fix[] = [];
        const tokenCtx: TokenRuleContext = {
          tree,
          lines: commentClearedLines,
          filePath: path,
          markdoc: markdocCtx,
          config: {
            ...tokenRule.defaults,
            ...(rule.assertions[assertionId] as Record<string, unknown> | undefined),
          },
          onError(info) {
            tokenProblems.push({
              file: path,
              line: info.line,
              column: info.column ?? 1,
              text: fileLines[info.line - 1] ?? '',
              match: info.context ?? '',
              ruleName: rule.name,
              // `info.severity` lets a single rule report at more than one
              // severity. `markdoc-attributes` is the only current user: a
              // missing required attribute or an enum violation is an error,
              // while an unknown attribute is only a warning. Every other
              // token rule falls back to the config's rule-level severity.
              severity: info.severity ?? rule.severity,
              message: formatTokenMessage(rule.message, tokenRule, info),
              // Per-finding, not per-rule: a fixable token rule still emits
              // findings it has no fixInfo for.
              fixable: Boolean(tokenRule.fixable && rule.fix !== false && info.fixInfo),
            });
            if (options.fix && tokenRule.fixable && rule.fix !== false && info.fixInfo) {
              tokenFixes.push({ file: path, ruleName: rule.name, ...info.fixInfo });
            }
          },
        };
        try {
          tokenRule.check(tokenCtx);
          problems.push(...tokenProblems.filter((problem) => problemAllowed(problem.line)));
          if (tokenFixes.length > 0) {
            const fileFixes = fixesByFile.get(path) ?? [];
            fileFixes.push(...tokenFixes.filter((fix) => problemAllowed(fix.lineNumber)));
            fixesByFile.set(path, fileFixes);
          }
        } catch (error) {
          problems.push(internalError(path, rule.name, error));
        }
      }
    }
  }

  // The final linted file may have pushed past the cap; drop the overflow.
  if (options.maxProblems !== undefined && problems.length > options.maxProblems) {
    problems.length = options.maxProblems;
    truncated = true;
  }

  const fixedFiles = new Map<string, string>();
  const fixes: Fix[] = [];
  const skippedFixes: Fix[] = [];
  if (options.fix) {
    for (const [path, fileFixes] of fixesByFile) {
      const original = files.find((file) => file.path === path);
      if (original && fileFixes.length > 0) {
        // The gate every proposed edit passes before it can touch a file: a
        // fix may not rewrite a markdoc tag's bytes. `protectMarkdocTags`
        // restores the tag into an otherwise-valid edit where it can, and
        // drops the edit where it cannot. Placed here, at the single point
        // where a run's fixes converge, so scope rules, token rules, and any
        // rule added later inherit it without knowing it exists.
        const guarded = protectMarkdocTags(
          fileFixes,
          tagSpansByFile.get(path) ?? [],
          original.content
        );
        skippedFixes.push(...guarded.dropped);
        const { content, applied, skipped } = applyFixesToContent(original.content, guarded.fixes);
        // Only record content when an edit actually landed — a file whose
        // every proposed fix was skipped is byte-identical, and reporting
        // it as "fixed" would make callers rewrite it (and convergence
        // loops spin) for nothing.
        if (applied.length > 0) fixedFiles.set(path, content);
        fixes.push(...applied);
        skippedFixes.push(...skipped);
      }
    }
  }

  return { problems, fixedFiles, fixes, skippedFixes, truncated };
}

// Cap on convergence passes for runRulesUntilStable — a safety net against
// a pathological/buggy rule whose fix() never stabilizes; five passes is
// far more than any real fixture needs (see fix-idempotency tests).
const MAX_FIX_PASSES = 5;

/**
 * Runs rules with fix:true repeatedly (lint → apply fixes → re-lint the
 * fixed content) until a pass produces zero fixes, capped at
 * MAX_FIX_PASSES. runRules() itself is single-pass by design (library
 * callers that need convergence should loop, as this helper does). This is
 * what public API's lintFiles() and the CLI's run
 * command use so a single --fix invocation fully converges instead of
 * requiring the user to re-run --fix multiple times.
 *
 * The returned `problems` are from the FIRST pass (matching prior
 * single-pass behavior: --fix reports the issues it found/fixed, not the
 * post-fix state) while `fixedFiles` reflects the final, fully-converged
 * content. `fixes` is the flat list of every fix genuinely applied across
 * all passes; `skippedFixes` holds only the fixes still pending after the
 * final pass. A fix skipped mid-run (overlap) is normally re-proposed
 * against the fixed content and applied by a later pass — it then counts
 * in `fixes`, not `skippedFixes` — so a non-empty `skippedFixes` here
 * means the run hit MAX_FIX_PASSES with conflicting edits unresolved.
 */
export async function runRulesUntilStable(
  files: FileInput[],
  rules: NormalizedRule[],
  options: Omit<RunnerOptions, 'fix'> = {}
): Promise<RunResult> {
  const firstPass = await runRules(files, rules, { ...options, fix: true });

  const fixedFiles = new Map(firstPass.fixedFiles);
  const allFixes = [...firstPass.fixes];
  let skippedFixes = firstPass.skippedFixes;

  let currentFiles = files.map((file) => ({
    ...file,
    content: fixedFiles.get(file.path) ?? file.content,
  }));

  for (let pass = 1; pass < MAX_FIX_PASSES && fixedFiles.size > 0; pass++) {
    const nextPass = await runRules(currentFiles, rules, { ...options, fix: true });
    // Only the latest pass's skips can still be pending: anything skipped
    // earlier was either re-proposed (and shows up again here) or its
    // underlying issue is gone.
    skippedFixes = nextPass.skippedFixes;
    if (nextPass.fixedFiles.size === 0) break;

    for (const [path, content] of nextPass.fixedFiles) {
      fixedFiles.set(path, content);
    }
    allFixes.push(...nextPass.fixes);
    currentFiles = currentFiles.map((file) => ({
      ...file,
      content: nextPass.fixedFiles.get(file.path) ?? file.content,
    }));
  }

  return {
    problems: firstPass.problems,
    fixedFiles,
    fixes: allFixes,
    skippedFixes,
    // `problems` come from the first pass, so its truncation flag is the one
    // that describes them (later passes only converge fixes).
    truncated: firstPass.truncated,
  };
}
