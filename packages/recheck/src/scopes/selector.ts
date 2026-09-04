import type { ScopedSegment } from './types.js';
import { validateScopeSelector } from './vocabulary.js';

export type ScopePredicate = (segment: ScopedSegment) => boolean;

const ALIASES: Record<string, string> = { default: 'summary' };

/**
 * One `&`-joined clause of a scope selector entry, e.g. `'~heading'` inside
 * `'paragraph & ~heading'`.
 */
export interface SelectorClause {
  /** The clause text as written (trimmed), including any leading `~`. */
  clause: string;
  /** True when the clause is `~`-negated. */
  negated: boolean;
  /** The scope name with negation marker and whitespace stripped. */
  term: string;
}

/**
 * Splits a selector entry into its `&`-joined clauses. This is THE selector
 * tokenizer: compilation (compileSelector below) and config validation
 * (scopes/vocabulary.ts validateScopeSelector, config/validate.ts) must all
 * parse selector entries through here, so the two sides can never drift
 * apart on what counts as a term.
 */
export function tokenizeSelector(raw: string): SelectorClause[] {
  return raw.split('&').map((part) => {
    const clause = part.trim();
    const negated = clause.startsWith('~');
    const term = (negated ? clause.slice(1) : clause).trim();
    return { clause, negated, term };
  });
}

/**
 * Order-preserving removal of duplicate messages within a single selector's
 * problem list. A selector that repeats the same mistake per clause
 * (`all & all`, `bogus & bogus`) produces the identical message once per
 * clause — reporting it twice adds noise, not information. Applied inside
 * the problem-producing helpers (wholeDocumentKeywordProblems here,
 * validateScopeSelector in vocabulary.ts) so every consumer — config
 * validation's error list and compileSelector's throw alike — gets the
 * deduplicated form.
 */
export function dedupeProblems(problems: string[]): string[] {
  return [...new Set(problems)];
}

/**
 * Problems with `all`/`raw` used as selector TERMS inside a compound or
 * negated expression. Both are whole-document keywords, not segment names —
 * extractScopes never emits segments with those scopes — so:
 * - as a conjunction term (`heading & all`) the keyword clause can never
 *   match a segment, and the whole rule silently reports nothing;
 * - negated (`~all`, `~raw`) the clause matches EVERY segment, silently
 *   meaning "everything" when the set-theoretic reading of `~all` is
 *   "nothing".
 * Bare `all`/`raw` as an entire single entry is NOT a problem — that's the
 * valid whole-document form compileSelector normalizes to `null`. Config
 * validation (config/validate.ts validateScope) surfaces these as
 * validation errors; compileSelector throws on them so direct runRules
 * callers that skip validation fail loudly instead of silently.
 */
export function wholeDocumentKeywordProblems(entry: string): string[] {
  const clauses = tokenizeSelector(entry);
  const problems: string[] = [];
  for (const { negated, term } of clauses) {
    if (term !== 'all' && term !== 'raw') continue;
    if (negated) {
      problems.push(
        `negating "${term}" in scope selector "${entry}" is not meaningful — ` +
          `"${term}" is a whole-document keyword, not a segment name, so "~${term}" would ` +
          `silently match every segment; use named scopes (e.g. \`~code & ~heading\`) ` +
          `or \`scope: ${term}\``
      );
    } else if (clauses.length > 1) {
      problems.push(
        `scope "${term}" covers the whole document and cannot be combined with other scopes ` +
          `in selector "${entry}" — use \`scope: ${term}\` alone`
      );
    }
  }
  return dedupeProblems(problems);
}

function termMatches(term: string, segmentScope: string): boolean {
  const resolved = ALIASES[term] ?? term;
  return segmentScope === resolved || segmentScope.startsWith(`${resolved}.`);
}

function compileTerm(raw: string): ScopePredicate {
  const clauses = tokenizeSelector(raw);
  return (segment) =>
    clauses.every(({ negated, term }) => {
      const matched = termMatches(term, segment.scope);
      return negated ? !matched : matched;
    });
}

export function compileSelector(scope: string | string[] | undefined): ScopePredicate | null {
  if (scope === undefined) return null;
  const entries = Array.isArray(scope) ? scope : [scope];
  if (entries.length === 0) return null;
  // Every term must pass the vocabulary/keyword checks before anything
  // compiles — a term that fails them can only compile to a silently-wrong
  // predicate:
  // - unknown terms ('heading & ALL' case typo; '~~code' double negation,
  //   whose post-~-strip term is '~code', unknown) compile to an
  //   always-false conjunct (rule lints nothing) or an always-true negation
  //   (rule fires on everything);
  // - 'all'/'raw' as compound or negated TERMS are never-matching for
  //   `heading & all`, always-matching for `~all` — see
  //   wholeDocumentKeywordProblems.
  // Both checks are the very helpers config validation runs
  // (config/validate.ts validateScope → validateScopeSelector +
  // wholeDocumentKeywordProblems), so validation and compilation can never
  // disagree on which terms exist; config-driven entry points reject these
  // shapes at validation first, and the throw here is for direct runRules
  // callers that skip validation — loud beats a rule that silently reports
  // nothing (or fires on everything).
  for (const entry of entries) {
    const problems = [...validateScopeSelector(entry), ...wholeDocumentKeywordProblems(entry)];
    if (problems.length > 0) {
      throw new Error(`Invalid scope selector: ${problems.join('; ')}`);
    }
  }
  // 'all'/'raw' are whole-document keywords, not segment names — extractScopes
  // never emits segments with those scopes, so they bypass filtering entirely
  // (null = "run against the whole file"). The single-element array form must
  // mean exactly what the bare string means (scope: ['all'] ≡ scope: all);
  // compiling these keywords into ordinary name predicates would silently
  // match nothing. Arrays MIXING 'all'/'raw' with other entries are rejected
  // at config validation (src/config/validate.ts validateScope) — they can't
  // reach here through any config-driven entry point.
  if (entries.length === 1) {
    const term = entries[0].trim();
    if (term === 'all' || term === 'raw') return null;
  }
  const predicates = entries.map(compileTerm);
  return (segment) => predicates.some((predicate) => predicate(segment));
}
