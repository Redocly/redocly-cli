import type { Fix } from '@redocly/recheck';
import { stripVTControlCharacters } from 'node:util';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { captureLogger } from '../../__tests__/capture-logger.js';
import { reportFixes } from '../fixes.js';

const fix = (overrides: Partial<Fix>): Fix => ({
  file: 'docs/a.md',
  ruleName: 'recheck/rule',
  lineNumber: 1,
  editColumn: 1,
  ...overrides,
});

afterEach(() => vi.restoreAllMocks());

describe('reportFixes', () => {
  it('groups the fixes by file and describes each kind of edit', () => {
    const { stderr } = captureLogger();

    reportFixes([
      fix({ lineNumber: 1, deleteCount: -1 }),
      fix({ lineNumber: 2, deleteCount: -1, insertText: 'new' }),
      fix({ lineNumber: 3, deleteCount: 2, insertText: 'x' }),
      fix({ lineNumber: 4, insertText: 'y' }),
      fix({ file: 'docs/b.md', lineNumber: 5 }),
    ]);

    expect(stripVTControlCharacters(stderr.join(''))).toBe(
      [
        '\n🔧 Auto-fix Summary:\n',
        '\n   docs/a.md:\n',
        '     ✓ Line 1 (recheck/rule): removed line\n',
        '     ✓ Line 2 (recheck/rule): replaced line with "new"\n',
        '     ✓ Line 3 (recheck/rule): replaced 2 character(s) with "x"\n',
        '     ✓ Line 4 (recheck/rule): inserted "y"\n',
        '\n   docs/b.md:\n',
        '     ✓ Line 5 (recheck/rule): applied fix\n',
      ].join('')
    );
  });
});
