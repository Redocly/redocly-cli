import { expect } from 'vitest';

import { validate } from '../../../config/validate.js';
import { newLineRe } from '../../../core/line-endings.js';
import { parseMarkdown } from '../../../parser/index.js';
import { extractScopes } from '../../../scopes/extractor.js';
import type { ScopedSegment } from '../../../scopes/types.js';
import type { ScopeRuleContext } from '../../types.js';

/** Builds a segment that covers the whole file, like the runner does for unscoped rules. */
export function wholeFileSegment(content: string): ScopedSegment {
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

/** Builds a rule context for an unscoped rule from raw markdown. */
export function buildWholeFileContext(content: string): ScopeRuleContext {
  return {
    segments: [wholeFileSegment(content)],
    content,
    tree: parseMarkdown(content),
  };
}

/** Builds a rule context with only the segments whose scope matches the filter. */
export function buildScopedContext(
  content: string,
  scopeFilter: (scope: string) => boolean,
  options: { markdoc?: boolean } = {}
): ScopeRuleContext {
  const tree = parseMarkdown(content, options);
  const segments = extractScopes(tree, content).filter((segment) => scopeFilter(segment.scope));
  return { segments, content, tree };
}

function validateOptions(assertionId: string, options: unknown) {
  return validate({
    'recheck/test-rule': {
      severity: 'error',
      message: 'Test message',
      assertions: { [assertionId]: options },
    },
  });
}

/** Asserts that `options` validate for the assertion with no errors. */
export async function expectValidOptions(assertionId: string, options: unknown): Promise<void> {
  const result = await validateOptions(assertionId, options);
  expect(result.errors).toEqual([]);
  expect(result.isValid).toBe(true);
}

/** Asserts that `options` are rejected with one error that mentions every string in `mentions`. */
export async function expectInvalidOptions(
  assertionId: string,
  options: unknown,
  ...mentions: string[]
): Promise<void> {
  const result = await validateOptions(assertionId, options);
  expect(result.isValid).toBe(false);
  expect(
    result.errors.some((error) => mentions.every((text) => error.message.includes(text)))
  ).toBe(true);
}
