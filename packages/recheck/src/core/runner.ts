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

// Assertions that don't work on embedded markdown, because they check the whole document
// or links to anchors that embedded content doesn't have.
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
   * Lint each input as embedded markdown instead of a whole document. A leading `---`
   * is content, not front matter, and the rules in EMBEDDED_UNSUPPORTED_RULES are skipped.
   */
  embedded?: boolean;
  /**
   * Maximum number of problems to collect. Once a file reaches the cap, its extra
   * problems are dropped and no more files are linted, and `truncated` is set.
   * No limit by default.
   */
  maxProblems?: number;
  /**
   * All configured rule names, used to warn about unknown rule names in inline
   * directives. Pass this when `rules` has the `severity: off` rules removed, so
   * a directive that names one of them is not reported as unknown. Defaults to the
   * names in `rules`.
   */
  knownRuleNames?: Set<string>;
  /** Parse Markdoc tags. Off by default. */
  markdoc?: boolean;
  /**
   * The Markdoc schema, used with `markdoc: true`. Without one, tags are still parsed and
   * paired, `ctx.markdoc.schema` is `null`, and no tag counts as self-closing.
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
  /** The fixes that were applied to `fixedFiles`. */
  fixes: Fix[];
  /**
   * Fixes that could not be applied, such as overlapping edits. For
   * `runRulesUntilStable`, only the fixes still skipped after the last pass.
   */
  skippedFixes: Fix[];
  /** True when `maxProblems` cut the run short. */
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
 * Returns a filter that drops repeated scope rule findings (same rule, file, position
 * and message) and keeps the first one.
 *
 * Scope segments overlap (a paragraph, its summary and its sentences cover the same
 * text), so one match can be reported once per segment.
 *
 * Token rule findings are not filtered, because markdownlint can report the same
 * finding twice and we match its output.
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

export async function runRules(
  files: FileInput[],
  rules: NormalizedRule[],
  options: RunnerOptions = {}
): Promise<RunResult> {
  if (options.embedded === true) {
    rules = rules.filter(
      (rule) => !Object.keys(rule.assertions).some((id) => EMBEDDED_UNSUPPORTED_RULES.has(id))
    );
  }
  const problems: Problem[] = [];
  const fixesByFile = new Map<string, Fix[]>();
  // Markdoc tag spans of each file, only collected when fixing. Used to protect tags from fixes.
  const tagSpansByFile = new Map<string, MarkdocTagSpan[]>();
  const isFirstOccurrence = createFindingDeduper();

  const selectors = new Map(rules.map((rule) => [rule.name, compileSelector(rule.scope)]));
  const knownRuleNames = options.knownRuleNames ?? new Set(rules.map((r) => r.name));

  // Skip `extractScopes` when every rule is a token rule, since those don't use segments.
  const hasScopeRules = rules.some((rule) =>
    Object.keys(rule.assertions).some((assertionId) => {
      try {
        return resolveAssertion(assertionId).kind === 'scope';
      } catch {
        return false;
      }
    })
  );

  // Skip the tag pairing when no rule uses it. Rules that use it have the `markdoc` tag.
  // `ctx.markdoc` is still provided, so rules that only read the schema keep working.
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

  // The same for every file, so work it out once.
  const markdocSchema = options.markdocSchema ?? null;
  const markdocSelfClosingTags = markdocSchema
    ? selfClosingTagNames(markdocSchema)
    : (new Set<string>() as ReadonlySet<string>);

  let truncated = false;

  for (const { path, content, metadata } of files) {
    // At the problem limit, skip the remaining files.
    if (options.maxProblems !== undefined && problems.length >= options.maxProblems) {
      truncated = true;
      break;
    }
    const tree = parseMarkdown(content, {
      markdoc: options.markdoc === true,
      embedded: options.embedded === true,
    });
    // Unknown rule names are reported even if the whole file is disabled.
    const directives = parseDirectives(tree, path, knownRuleNames);
    problems.push(...directives.warnings);
    if (directives.fileDisabled) continue;
    if (options.fix) tagSpansByFile.set(path, markdocTagSpans(tree, content));
    const allSegments = hasScopeRules ? extractScopes(tree, content) : [];
    // Split with newLineRe, not '\n', so CRLF files have no '\r' left on the lines.
    const fileLines = content.split(newLineRe);
    // Token rules read lines with HTML comment text blanked out, so content inside a
    // comment is not checked. Positions are the same as in the raw `fileLines`, which
    // are used for `Problem.text` and for skipping lines.
    const commentClearedLines = clearHtmlCommentText(content).split(newLineRe);
    // Undefined when Markdoc parsing is off, so a rule can check `if (!ctx.markdoc) return;`.
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
      // Filtered on first use and reused by the rule's other assertions.
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
          // Whether `--fix` could fix this rule's findings. A rule can still mark
          // individual problems as not fixable.
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
              // A rule can set its own severity per finding. Otherwise the configured severity is
              // used.
              severity: info.severity ?? rule.severity,
              message: formatTokenMessage(rule.message, tokenRule, info),
              // Some findings of a fixable rule have no fix.
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

  // The last file may have gone over the limit.
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
        // Fixes must not change a Markdoc tag. `protectMarkdocTags` keeps the tag
        // in the edit where it can, and drops the edit otherwise.
        const guarded = protectMarkdocTags(
          fileFixes,
          tagSpansByFile.get(path) ?? [],
          original.content
        );
        skippedFixes.push(...guarded.dropped);
        const { content, applied, skipped } = applyFixesToContent(original.content, guarded.fixes);
        // Only report the file as fixed if an edit was applied.
        if (applied.length > 0) fixedFiles.set(path, content);
        fixes.push(...applied);
        skippedFixes.push(...skipped);
      }
    }
  }

  return { problems, fixedFiles, fixes, skippedFixes, truncated };
}

// Maximum number of fix passes, in case a rule's fixes never settle.
const MAX_FIX_PASSES = 5;

/**
 * Runs the rules with fixes, then runs them again on the fixed content, until no more
 * fixes apply or MAX_FIX_PASSES is reached. A single `--fix` run then fixes everything.
 *
 * `problems` come from the first pass, so they are the problems that were found before
 * fixing. `fixedFiles` has the final content. `skippedFixes` has only the fixes still
 * skipped after the last pass.
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
    // Fixes skipped in earlier passes are either proposed again in this pass or no longer needed.
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
    truncated: firstPass.truncated,
  };
}
