import { describe, expect, it } from 'vitest';

import {
  isRecheckPreset,
  mergeRecheckBlocks,
  mergeRecheckRule,
  mergeRecheckRules,
  orderRecheckPresets,
} from '../recheck.js';

const preset = {
  severity: 'error' as const,
  message: 'Line length',
  assertions: { 'line-length': { max: 80 } },
};

describe('isRecheckPreset', () => {
  it('matches the recheck/ prefix only', () => {
    expect(isRecheckPreset('recheck/markdown')).toBe(true);
    expect(isRecheckPreset('recommended')).toBe(false);
    expect(isRecheckPreset('my-plugin/recheck')).toBe(false);
  });
});

describe('orderRecheckPresets', () => {
  it('keeps each name once at its last position and does not change the input', () => {
    const names = ['a', 'b', 'a'];
    expect(orderRecheckPresets(names)).toEqual(['b', 'a']);
    expect(names).toEqual(['a', 'b', 'a']);
  });

  it('returns an empty list for an empty list', () => {
    expect(orderRecheckPresets([])).toEqual([]);
  });
});

describe('mergeRecheckRule', () => {
  it('sets the severity from a string and keeps the rest', () => {
    expect(mergeRecheckRule(preset, 'off')).toEqual({ ...preset, severity: 'off' });
  });

  it('merges assertions per assertion id', () => {
    const merged = mergeRecheckRule(preset, {
      assertions: { 'line-length': { max: 120 }, other: {} },
    });
    expect(merged).toEqual({
      severity: 'error',
      message: 'Line length',
      assertions: { 'line-length': { max: 120 }, other: {} },
    });
  });

  it('keeps a severity string base under an object override', () => {
    expect(mergeRecheckRule('off', { severity: 'warn' })).toEqual({ severity: 'warn' });
    expect(mergeRecheckRule('warn', { assertions: { x: {} } })).toEqual({
      severity: 'warn',
      assertions: { x: {} },
    });
  });

  it('replaces the entry for any other value', () => {
    expect(mergeRecheckRule(preset, null)).toBeNull();
    expect(mergeRecheckRule(null, 'warn')).toBe('warn');
  });
});

describe('mergeRecheckRules', () => {
  it('merges by key, adds new keys, and changes neither input', () => {
    const base = { a: preset };
    const override = { a: 'warn', b: { severity: 'info' } };
    const merged = mergeRecheckRules(base, override);
    expect(merged.a).toEqual({ ...preset, severity: 'warn' });
    expect(merged.b).toEqual({ severity: 'info' });
    expect(base.a.severity).toBe('error');
    expect(override.a).toBe('warn');
  });

  it('treats missing inputs as empty', () => {
    expect(mergeRecheckRules(undefined, undefined)).toEqual({});
  });
});

describe('mergeRecheckBlocks', () => {
  it('merges rules by key and assigns the other keys', () => {
    const merged = mergeRecheckBlocks(
      { rules: { a: preset }, excludes: ['x/**'] },
      { rules: { a: 'off' }, markdoc: true }
    );
    expect(merged).toEqual({
      rules: { a: { ...preset, severity: 'off' } },
      excludes: ['x/**'],
      markdoc: true,
    });
  });

  it('keeps the base rules when the override has no usable rules', () => {
    expect(mergeRecheckBlocks({ rules: { a: preset } }, { rules: null })).toEqual({
      rules: { a: preset },
    });
    expect(mergeRecheckBlocks({ rules: { a: preset } }, undefined)).toEqual({
      rules: { a: preset },
    });
  });

  it('returns a block that is not an object as it is, so the engine reports it', () => {
    expect(mergeRecheckBlocks({ rules: {} }, 5)).toBe(5);
  });

  it('keeps a base that is not an object, so the engine reports it', () => {
    expect(mergeRecheckBlocks(5 as never, { rules: {} })).toBe(5);
  });
});
