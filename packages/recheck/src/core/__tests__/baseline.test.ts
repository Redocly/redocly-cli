import { describe, it, expect } from 'vitest';

import type { Problem } from '../../types/index.js';
import {
  parseBaseline,
  buildBaseline,
  serializeBaseline,
  compareToBaseline,
  baselineKeyMapper,
} from '../baseline.js';

function problem(file: string, ruleName: string, overrides: Partial<Problem> = {}): Problem {
  return {
    file,
    line: 1,
    column: 1,
    text: 't',
    match: 'm',
    ruleName,
    severity: 'error',
    message: 'msg',
    ...overrides,
  };
}

const identity = (file: string) => file;

describe('parseBaseline', () => {
  it('round-trips through serializeBaseline', () => {
    const baseline = buildBaseline(
      [
        problem('b.md', 'recheck/two'),
        problem('a.md', 'recheck/one'),
        problem('a.md', 'recheck/one'),
      ],
      identity
    );
    const text = serializeBaseline(baseline);
    expect(parseBaseline(text, 'x.yaml')).toEqual({
      version: 1,
      files: { 'a.md': { 'recheck/one': 2 }, 'b.md': { 'recheck/two': 1 } },
    });
  });

  it('serialization is sorted and stable', () => {
    const a = serializeBaseline({
      version: 1,
      files: { 'b.md': { z: 1, a: 2 }, 'a.md': { m: 3 } },
    });
    const b = serializeBaseline({
      version: 1,
      files: { 'a.md': { m: 3 }, 'b.md': { a: 2, z: 1 } },
    });
    expect(a).toBe(b);
    expect(a.indexOf('a.md')).toBeLessThan(a.indexOf('b.md'));
  });

  it('rejects a wrong version, a non-mapping, and a non-positive count', () => {
    expect(() => parseBaseline('version: 2\nfiles: {}\n', 'x')).toThrow(/unsupported version/);
    expect(() => parseBaseline('- a\n', 'x')).toThrow(/mapping/);
    expect(() => parseBaseline('version: 1\nfiles:\n  a.md:\n    r: 0\n', 'x')).toThrow(
      /positive integer/
    );
  });
});

describe('buildBaseline', () => {
  it('counts only errors', () => {
    const baseline = buildBaseline(
      [problem('a.md', 'r'), problem('a.md', 'r', { severity: 'warn' })],
      identity
    );
    expect(baseline.files).toEqual({ 'a.md': { r: 1 } });
  });
});

describe('compareToBaseline', () => {
  const options = (files: string[], rules: string[]) => ({
    scannedFiles: files,
    executedRules: new Set(rules),
    toKey: identity,
  });

  it('suppresses a matching group and passes non-errors through', () => {
    const result = compareToBaseline(
      [problem('a.md', 'r'), problem('a.md', 'r', { severity: 'warn' })],
      { version: 1, files: { 'a.md': { r: 1 } } },
      options(['a.md'], ['r'])
    );
    expect(result.suppressed).toBe(1);
    expect(result.newFindings).toBe(0);
    expect(result.staleEntries).toBe(0);
    expect(result.problems.map((p) => p.severity)).toEqual(['warn']);
  });

  it('keeps every finding of an over-budget group, annotated with the budget', () => {
    const result = compareToBaseline(
      [problem('a.md', 'r'), problem('a.md', 'r')],
      { version: 1, files: { 'a.md': { r: 1 } } },
      options(['a.md'], ['r'])
    );
    expect(result.newFindings).toBe(1);
    expect(result.suppressed).toBe(0);
    expect(result.problems).toHaveLength(2);
    expect(result.problems[0].message).toContain('(baseline 1, found 2)');
  });

  it('an unbaselined finding is reported without annotation', () => {
    const result = compareToBaseline(
      [problem('a.md', 'r')],
      { version: 1, files: {} },
      options(['a.md'], ['r'])
    );
    expect(result.problems[0].message).toBe('msg');
    expect(result.newFindings).toBe(1);
  });

  it('a count below budget is stale and fails with the regeneration command', () => {
    const result = compareToBaseline(
      [],
      { version: 1, files: { 'a.md': { r: 2 } } },
      options(['a.md'], ['r'])
    );
    expect(result.staleEntries).toBe(1);
    expect(result.problems[0].severity).toBe('error');
    expect(result.problems[0].message).toMatch(
      /stale.*expected 2.*found 0.*recheck --generate-baseline/s
    );
  });

  it('a deleted file is the same stale case when it was in the scan scope', () => {
    const result = compareToBaseline(
      [],
      { version: 1, files: { 'gone.md': { r: 1 } } },
      options(['gone.md'], ['r'])
    );
    expect(result.staleEntries).toBe(1);
  });

  it('staleness is scoped to scanned files', () => {
    const result = compareToBaseline(
      [],
      { version: 1, files: { 'unscanned.md': { r: 5 } } },
      options(['other.md'], ['r'])
    );
    expect(result.staleEntries).toBe(0);
  });

  it('staleness is scoped to executed rules', () => {
    const result = compareToBaseline(
      [],
      { version: 1, files: { 'a.md': { 'filtered-out': 5 } } },
      options(['a.md'], ['some-other-rule'])
    );
    expect(result.staleEntries).toBe(0);
  });
});

describe('baselineKeyMapper', () => {
  it('maps scanned paths to config-relative forward-slash keys', () => {
    const toKey = baselineKeyMapper('/repo');
    expect(toKey('/repo/docs/a.md')).toBe('docs/a.md');
  });
});

describe('deleted files under a scan root', () => {
  it('an entry under an exhaustively walked root is stale when its file is gone', () => {
    const result = compareToBaseline(
      [],
      { version: 1, files: { 'docs/gone.md': { r: 1 } } },
      { scannedFiles: [], executedRules: new Set(['r']), toKey: identity, scanRoots: ['docs'] }
    );
    expect(result.staleEntries).toBe(1);
  });

  it('without scan roots (changed-only), a missing file proves nothing', () => {
    const result = compareToBaseline(
      [],
      { version: 1, files: { 'docs/gone.md': { r: 1 } } },
      { scannedFiles: [], executedRules: new Set(['r']), toKey: identity }
    );
    expect(result.staleEntries).toBe(0);
  });

  it('an entry outside the walked root stays out of scope', () => {
    const result = compareToBaseline(
      [],
      { version: 1, files: { 'other/gone.md': { r: 1 } } },
      { scannedFiles: [], executedRules: new Set(['r']), toKey: identity, scanRoots: ['docs'] }
    );
    expect(result.staleEntries).toBe(0);
  });
});
