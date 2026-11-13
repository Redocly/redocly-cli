import type { ScopedSegment } from './types.js';
import { validateScopeSelector } from './vocabulary.js';

export type ScopePredicate = (segment: ScopedSegment) => boolean;

const ALIASES: Record<string, string> = { default: 'summary' };

/** One `&`-joined clause of a scope selector entry, e.g. `'~heading'` in `'paragraph & ~heading'`. */
export interface SelectorClause {
  /** The clause text as written (trimmed), including any leading `~`. */
  clause: string;
  /** True when the clause is `~`-negated. */
  negated: boolean;
  /** The scope name with negation marker and whitespace stripped. */
  term: string;
}

/**
 * Splits a selector entry into its `&`-joined clauses. Compiling and config validation both
 * use this, so they agree on what a term is.
 */
export function tokenizeSelector(raw: string): SelectorClause[] {
  return raw.split('&').map((part) => {
    const clause = part.trim();
    const negated = clause.startsWith('~');
    const term = (negated ? clause.slice(1) : clause).trim();
    return { clause, negated, term };
  });
}

/** Removes duplicate messages, keeping order (`all & all` would otherwise report one per clause). */
export function dedupeProblems(problems: string[]): string[] {
  return [...new Set(problems)];
}

/**
 * Problems with `all` or `raw` used as terms in a compound or negated selector. They are
 * whole-document keywords, not segment names, so `heading & all` would never match and `~all`
 * would match everything. A bare `all` or `raw` as the whole entry is fine.
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
  // Reject invalid terms (unknown names, `~~code`, compound or negated `all`/`raw`) up front.
  // Config validation runs the same checks. This throw is for callers that skip validation.
  for (const entry of entries) {
    const problems = [...validateScopeSelector(entry), ...wholeDocumentKeywordProblems(entry)];
    if (problems.length > 0) {
      throw new Error(`Invalid scope selector: ${problems.join('; ')}`);
    }
  }
  // 'all' and 'raw' are whole-document keywords, not segment names, so they skip filtering
  // (null means run against the whole file). `['all']` means the same as `all`.
  if (entries.length === 1) {
    const term = entries[0].trim();
    if (term === 'all' || term === 'raw') return null;
  }
  const predicates = entries.map(compileTerm);
  return (segment) => predicates.some((predicate) => predicate(segment));
}
