import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  mergeRecheckRules,
  mergeRuleEntry,
  presetConfigs,
  type RecheckRulesInput,
} from '../public.js';

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

  // Unvalidated YAML can hold values outside `RecheckRuleInput`; the casts model that.
  it('replaces the entry with a null override and does not throw', () => {
    const override = { 'recheck/line-length': null } as unknown as RecheckRulesInput;
    expect(mergeRecheckRules(preset, override)['recheck/line-length']).toBeNull();
  });

  it('replaces the entry with a number override as given', () => {
    const override = { 'recheck/line-length': 5 } as unknown as RecheckRulesInput;
    expect(mergeRecheckRules(preset, override)['recheck/line-length']).toBe(5);
  });

  it('sets a string override on a null entry', () => {
    const base = { 'recheck/line-length': null } as unknown as RecheckRulesInput;
    const merged = mergeRecheckRules(base, { 'recheck/line-length': 'warn' });
    expect(merged['recheck/line-length']).toBe('warn');
  });
});

describe('the config entry', () => {
  const srcDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

  // Follows value imports only; `import type` is erased at compile time.
  function runtimeImports(file: string, reached = new Set<string>()): Set<string> {
    if (reached.has(file)) return reached;
    reached.add(file);
    const source = readFileSync(file, 'utf8');
    for (const [, specifier] of source.matchAll(
      /^(?:import|export)(?!\s+type\b)[^;]*?\sfrom\s+'(\.[^']+)';/gms
    )) {
      runtimeImports(resolve(dirname(file), specifier.replace(/\.js$/, '.ts')), reached);
    }
    return reached;
  }

  it('exports the presets as configs with a recheck block', () => {
    expect(presetConfigs.markdown.recheck.rules?.['recheck/line-length']).toEqual({
      severity: 'error',
      assertions: { 'line-length': {} },
    });
  });

  it('loads only the presets and small helpers', () => {
    const reached = [...runtimeImports(resolve(srcDir, 'config/public.ts'))]
      .map((file) => relative(srcDir, file))
      .filter((file) => !/^config\/(public|presets\/[a-z-]+)\.ts$/.test(file));
    expect(reached).toEqual(['utils/is-plain-object.ts']);
  });
});
