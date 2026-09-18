import { newLineRe } from '../../../core/line-endings.js';
import { parseMarkdown } from '../../../parser/index.js';
import type { ScopedSegment } from '../../../scopes/types.js';
import type { ScopeRuleContext } from '../../types.js';

/**
 * Build a whole-file ScopedSegment, matching the runner's behavior for
 * unscoped rules (see wholeFileSegment in src/core/runner.ts).
 */
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

/**
 * Build a ScopeRuleContext for a whole-file (unscoped) rule from raw markdown
 * content — the common case in migrated assertion tests.
 */
export function buildWholeFileContext(content: string): ScopeRuleContext {
  return {
    segments: [wholeFileSegment(content)],
    content,
    tree: parseMarkdown(content),
  };
}
