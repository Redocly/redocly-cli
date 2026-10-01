import { newLineRe } from '../../../core/line-endings.js';
import { parseMarkdown } from '../../../parser/index.js';
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
