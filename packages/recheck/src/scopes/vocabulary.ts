import { dedupeProblems, tokenizeSelector } from './selector.js';

// Scope names recognized by the extractor and selector. Config schema and validation use this
// list too. 'all' and 'raw' are selector keywords, not segment scopes, but are valid `scope`
// values. 'default' is an alias for 'summary'.
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
 * True when `term` (without `~` or whitespace) is a known scope name: a base scope or
 * `heading.h1` to `heading.h6`.
 */
export function isKnownScopeTerm(term: string): boolean {
  return (BASE_SCOPES as readonly string[]).includes(term) || HEADING_LEVEL_PATTERN.test(term);
}

/**
 * Validates one scope selector, e.g. `'~blockquote & ~heading'`. Returns a message for each
 * problem found, or an empty list when valid.
 */
export function validateScopeSelector(raw: string): string[] {
  const problems: string[] = [];
  // Uses the same tokenizer as compileSelector, so both agree on where a term starts and ends.
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
  // A repeated bad clause ('bogus & bogus') would give the same message twice.
  return dedupeProblems(problems);
}
