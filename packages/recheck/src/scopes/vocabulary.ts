import { dedupeProblems, tokenizeSelector } from './selector.js';

// Canonical list of scope names recognized by the extractor/selector. Schema
// validation (src/config/schema.ts) and semantic validation
// (src/config/validate.ts) both derive from this list so they can't drift
// from what extractScopes()/compileSelector() actually support.
//
// 'all' and 'raw' are special-cased selector keywords (they bypass
// filtering entirely — see compileSelector) rather than segment scopes, but
// they're valid values for the `scope` config field, so they're included
// here too. 'default' is a permanent alias for 'summary' (see
// scopes/selector.ts ALIASES).
export const BASE_SCOPES = [
  'all',
  'raw',
  'default',
  'summary',
  'sentence',
  'paragraph',
  'heading',
  'code',
  'list-item',
  'blockquote',
  'table.header',
  'table.cell',
  'markdoc.tag',
  'frontmatter',
  'html',
  'comment',
  'alt',
  'link',
] as const;

const HEADING_LEVEL_PATTERN = /^heading\.h[1-6]$/;

/**
 * True when `term` (already stripped of any leading `~` negation and
 * surrounding whitespace) is a recognized scope name — either an exact
 * base-vocabulary match or a `heading.h1`-`heading.h6` level selector.
 */
export function isKnownScopeTerm(term: string): boolean {
  return (BASE_SCOPES as readonly string[]).includes(term) || HEADING_LEVEL_PATTERN.test(term);
}

/**
 * Validates a single scope string, which may be a bare scope name or a
 * selector clause of `&`-joined (optionally `~`-negated) terms, e.g.
 * `'~blockquote & ~heading'`. Returns a list of problems found (empty when
 * valid) — each problem names the offending term/clause for a helpful error
 * message.
 */
export function validateScopeSelector(raw: string): string[] {
  const problems: string[] = [];
  // Parses via the selector module's own tokenizer (the one compileSelector
  // compiles with) so validation and compilation can never disagree about
  // where a term starts or ends.
  for (const { clause, term } of tokenizeSelector(raw)) {
    if (clause === '') {
      problems.push(`empty clause in scope selector "${raw}"`);
      continue;
    }
    if (term === '') {
      problems.push(`missing scope name after "~" in scope selector "${raw}"`);
      continue;
    }
    if (!isKnownScopeTerm(term)) {
      problems.push(`unknown scope "${term}" in scope selector "${raw}"`);
    }
  }
  // Order-preserving: a selector repeating the same bad clause ('bogus &
  // bogus') yields the identical message once per clause — report it once.
  return dedupeProblems(problems);
}
