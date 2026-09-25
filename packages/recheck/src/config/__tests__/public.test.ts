import { describe, expect, it } from 'vitest';

import { mergeRecheckRules, mergeRuleEntry } from '../public.js';

const preset = {
  'recheck/line-length': {
    severity: 'error' as const,
    message: 'Line length',
    assertions: { 'line-length': { max: 80 } },
  },
};

describe('mergeRuleEntry', () => {
  it('sets the severity from a string and keeps the rest of the entry', () => {
    const merged = mergeRuleEntry(preset['recheck/line-length'], 'off');
    expect(merged).toEqual({
      severity: 'off',
      message: 'Line length',
      assertions: { 'line-length': { max: 80 } },
    });
  });

  it('merges assertions per assertion id', () => {
    const merged = mergeRuleEntry(preset['recheck/line-length'], {
      assertions: { 'line-length': { max: 120 }, other: {} },
    });
    expect(merged.severity).toBe('error');
    expect(merged.message).toBe('Line length');
    expect(merged.assertions).toEqual({ 'line-length': { max: 120 }, other: {} });
  });
});

describe('mergeRecheckRules', () => {
  it('merges by rule key and adds new keys as given', () => {
    const merged = mergeRecheckRules(preset, {
      'recheck/line-length': 'warn',
      'recheck/new-rule': { severity: 'info' },
    });
    expect(merged['recheck/line-length']).toMatchObject({
      severity: 'warn',
      message: 'Line length',
    });
    expect(merged['recheck/new-rule']).toEqual({ severity: 'info' });
  });

  it('changes neither input', () => {
    const override = { 'recheck/line-length': 'off' as const };
    mergeRecheckRules(preset, override);
    expect(preset['recheck/line-length'].severity).toBe('error');
    expect(override).toEqual({ 'recheck/line-length': 'off' });
  });

  it('treats missing inputs as empty', () => {
    expect(mergeRecheckRules(undefined, undefined)).toEqual({});
    expect(mergeRecheckRules(preset, undefined)).toEqual(preset);
  });
});
