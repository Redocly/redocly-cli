import { describe, expect, it } from 'vitest';

import type { TokenRule } from '../../types.js';
import { formatTemplate, formatTokenMessage } from '../messages.js';

const rule = (defaults: Record<string, unknown>): TokenRule => ({
  name: 'x',
  tags: [],
  fixable: false,
  defaults,
  check() {},
});

describe('formatTemplate', () => {
  it('substitutes %s left to right', () => {
    expect(formatTemplate('Use "%s" not "%s".', 'a', 'b')).toBe('Use "a" not "b".');
  });
  it('leaves surplus %s verbatim and ignores surplus values', () => {
    expect(formatTemplate('%s and %s', 'only')).toBe('only and %s');
    expect(formatTemplate('none', 'extra')).toBe('none');
  });
  it('passes values containing $ sequences through literally', () => {
    expect(formatTemplate('x %s', 'a$&b')).toBe('x a$&b');
    expect(formatTemplate('x %s', "a$'b")).toBe("x a$'b");
  });
  it('never re-consumes %s introduced by a substituted value', () => {
    expect(formatTemplate('%s %s', 'a%sb', 'c')).toBe('a%sb c');
  });
});

describe('formatTokenMessage', () => {
  it('prefers config message and substitutes context', () => {
    expect(
      formatTokenMessage('Bad: %s', rule({ message: 'Default.' }), { line: 1, context: 'foo' })
    ).toBe('Bad: foo');
  });
  it('falls back to rule default message and appends detail', () => {
    expect(
      formatTokenMessage(undefined, rule({ message: 'Default.' }), { line: 1, detail: 'why' })
    ).toBe('Default. (why)');
  });
});
