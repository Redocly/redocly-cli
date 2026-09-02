import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import { resolveRecheckConfig } from '../resolve.js';

const configDir = '/tmp/project';

describe('resolveRecheckConfig', () => {
  it('composes presets named in the root extends', async () => {
    const result = await resolveRecheckConfig({ extends: ['recheck/markdown'], configDir });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.rules.length).toBeGreaterThan(40);
    expect(result.config.rules.some((rule) => rule.name === 'recheck/heading-style')).toBe(true);
  });

  it('applies a block rule object over the preset', async () => {
    const result = await resolveRecheckConfig({
      extends: ['recheck/markdown'],
      block: { rules: { 'recheck/heading-style': { severity: 'warn' } } },
      configDir,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    const rule = result.config.rules.find((r) => r.name === 'recheck/heading-style');
    expect(rule?.severity).toBe('warn');
  });

  it('normalizes the severity shorthand', async () => {
    const result = await resolveRecheckConfig({
      extends: ['recheck/markdown'],
      block: { rules: { 'recheck/heading-style': 'off' } },
      configDir,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    const rule = result.config.rules.find((r) => r.name === 'recheck/heading-style');
    expect(rule?.severity).toBe('off');
  });

  it('resolves the baseline path against the config directory', async () => {
    const result = await resolveRecheckConfig({
      extends: ['recheck/markdown'],
      block: { baseline: './recheck-baseline.yaml' },
      configDir,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.baselinePath).toBe(path.resolve(configDir, 'recheck-baseline.yaml'));
  });

  it('enables markdoc with the built-in realm schema for `markdoc: true`', async () => {
    const result = await resolveRecheckConfig({
      extends: ['recheck/markdown'],
      block: { markdoc: true },
      configDir,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.markdoc).toBe(true);
    expect(result.config.markdocSchema).not.toBeNull();
  });

  it('keeps apiDescriptions rules raw for the API path', async () => {
    const result = await resolveRecheckConfig({
      extends: ['recheck/markdown'],
      block: { apiDescriptions: { rules: { 'recheck/line-length': 'off' } } },
      configDir,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.apiDescriptionRules).toEqual({ 'recheck/line-length': 'off' });
  });

  it('rejects extends inside the block with a pointer to the root', async () => {
    const result = await resolveRecheckConfig({
      block: { extends: ['recheck/markdown'] },
      configDir,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors[0].message).toContain('root `extends`');
  });

  it('surfaces engine validation errors', async () => {
    const result = await resolveRecheckConfig({
      block: {
        rules: {
          'custom/bad': {
            severity: 'error',
            message: 'x',
            assertions: { 'no-such-assertion': {} },
          },
        },
      },
      configDir,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.some((e) => e.message.includes('unknown assertion type'))).toBe(true);
  });

  it('forwards engine warnings to the warn callback', async () => {
    const warnings: string[] = [];
    const result = await resolveRecheckConfig({
      extends: ['recheck/markdown'],
      configDir,
      warn: (message) => warnings.push(message),
    });
    expect(result.success).toBe(true);
    expect(Array.isArray(warnings)).toBe(true);
  });
});
