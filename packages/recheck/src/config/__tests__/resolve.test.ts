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

  it('rejects extends inside the block with a pointer to the root', async () => {
    const result = await resolveRecheckConfig({
      block: { extends: ['recheck/markdown'] },
      configDir,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors[0].message).toContain('root `extends`');
  });

  it('rejects a non-object `rules` block instead of silently ignoring it', async () => {
    const result = await resolveRecheckConfig({
      extends: ['recheck/markdown'],
      block: { rules: 'typo' },
      configDir,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors).toEqual([
      { message: '`recheck.rules` must be an object', path: 'recheck.rules' },
    ]);
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
    // Extending `recheck/markdoc` without turning `markdoc` parsing on is a
    // real validate() warning (see validate.ts's warnStaleMarkdocPreset) —
    // this input reliably produces one to forward.
    const result = await resolveRecheckConfig({
      extends: ['recheck/markdoc'],
      configDir,
      warn: (message) => warnings.push(message),
    });
    expect(result.success).toBe(true);
    expect(
      warnings.some((message) =>
        message.includes('extends "recheck/markdoc" but "markdoc" parsing is off')
      )
    ).toBe(true);
  });

  it('applies apiDescriptions.rules onto the effective rules for descriptions', async () => {
    const result = await resolveRecheckConfig({
      extends: ['recheck/markdown'],
      block: {
        apiDescriptions: {
          rules: {
            'recheck/line-length': 'off',
            'recheck/no-trailing-spaces': { severity: 'warn' },
          },
        },
      },
      configDir: process.cwd(),
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    const pages = new Map(result.config.rules.map((rule) => [rule.name, rule.severity]));
    const descriptions = new Map(
      result.config.descriptionRules.map((rule) => [rule.name, rule.severity])
    );
    expect(pages.get('recheck/line-length')).not.toBe('off');
    expect(descriptions.get('recheck/line-length')).toBe('off');
    expect(descriptions.get('recheck/no-trailing-spaces')).toBe('warn');
    expect(result.config.descriptionRules).toHaveLength(result.config.rules.length);
  });

  it('rejects an apiDescriptions override for a rule that is not in effect', async () => {
    const result = await resolveRecheckConfig({
      extends: ['recheck/markdown'],
      block: { apiDescriptions: { rules: { 'recheck/nope': 'off' } } },
      configDir: process.cwd(),
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.map((error) => error.path)).toEqual([
      'recheck.apiDescriptions.rules.recheck/nope',
    ]);
  });
});
