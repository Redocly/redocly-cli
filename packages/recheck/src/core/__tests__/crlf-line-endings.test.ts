import { describe, expect, it } from 'vitest';

import type { NormalizedRule } from '../../types/index.js';
import { runRules, runRulesUntilStable } from '../runner.js';

// Regression fixture for CRLF handling: the runner used to build ctx.lines
// via content.split('\n'), leaving a trailing '\r' on every line of a CRLF
// file. That made no-trailing-spaces (trimEnd-based) flag nearly every
// line, turned a hard-break's intentional two trailing spaces into three
// "trailing" characters, and let --fix mangle the file. Upstream
// markdownlint splits with newLineRe (/\r\n?|\n/) and rejoins fixed
// content with the file's own preferred line ending — the runner and
// applyFixesToContent must mirror that.

const noTrailingSpaces: NormalizedRule = {
  name: 'recheck/no-trailing-spaces',
  shortName: 'no-trailing-spaces',
  severity: 'error',
  message: 'Remove trailing spaces.',
  assertions: { 'no-trailing-spaces': {} },
};

const noDuplicateHeading: NormalizedRule = {
  name: 'recheck/no-duplicate-heading',
  shortName: 'no-duplicate-heading',
  severity: 'error',
  message: 'No duplicate headings.',
  assertions: { 'no-duplicate-heading': {} },
};

// Clean lines (must NOT be flagged), one genuinely dirty line (3 trailing
// spaces), and a hard-break line (exactly 2 trailing spaces — an
// intentional Markdown hard break under MD009's default brSpaces: 2, so it
// must NOT be flagged and --fix must NOT touch it).
const CRLF_FIXTURE = '# Title\r\n\r\nclean line\r\ndirty line   \r\nhard break  \r\nlast line\r\n';

describe('CRLF line endings (runner + fixer)', () => {
  it('splits ctx.lines on CRLF so clean lines are not flagged as having trailing spaces', async () => {
    const { problems } = await runRules(
      [{ path: 'a.md', content: CRLF_FIXTURE }],
      [noTrailingSpaces]
    );
    expect(problems.map((p) => [p.line, p.column])).toEqual([[4, 11]]);
  });

  it('reports AST-derived token-rule positions correctly on CRLF files', async () => {
    const md = '# Same\r\n\r\ntext\r\n\r\n# Same\r\n';
    const { problems } = await runRules([{ path: 'a.md', content: md }], [noDuplicateHeading]);
    expect(problems.map((p) => [p.line, p.column])).toEqual([[5, 1]]);
  });

  it('--fix rewrites only the dirty line and preserves CRLF endings byte-for-byte', async () => {
    const { fixedFiles } = await runRulesUntilStable(
      [{ path: 'a.md', content: CRLF_FIXTURE }],
      [noTrailingSpaces]
    );
    expect(fixedFiles.get('a.md')).toBe(
      '# Title\r\n\r\nclean line\r\ndirty line\r\nhard break  \r\nlast line\r\n'
    );
  });

  it('leaves an already-clean CRLF file untouched under --fix', async () => {
    const clean = '# Title\r\n\r\nclean line\r\nhard break  \r\nlast line\r\n';
    const { problems, fixedFiles } = await runRulesUntilStable(
      [{ path: 'a.md', content: clean }],
      [noTrailingSpaces]
    );
    expect(problems).toEqual([]);
    expect(fixedFiles.size).toBe(0);
  });
});
