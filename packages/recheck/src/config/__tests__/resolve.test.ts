import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { presets } from '../presets/index.js';
import { buildMarkdownPreset } from '../presets/markdown.js';
import { DEFAULT_BASELINE_FILE, resolveRecheckConfig } from '../resolve.js';

const configDir = '/tmp/project';

describe('resolveRecheckConfig', () => {
  it('composes presets named in the root extends', async () => {
    const result = await resolveRecheckConfig({
      extends: ['recheck/markdown'],
      configDir,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.rules.length).toBeGreaterThan(40);
    expect(result.config.rules.some((rule) => rule.name === 'recheck/heading-style')).toBe(true);
  });

  it('applies a block rule object over the preset', async () => {
    const result = await resolveRecheckConfig({
      extends: ['recheck/markdown'],
      block: {
        rules: { 'recheck/heading-style': { severity: 'warn' } },
      },
      configDir,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    const rule = result.config.rules.find((r) => r.name === 'recheck/heading-style');
    expect(rule?.severity).toBe('warn');
  });

  it('turns a severity shorthand without a preset into a rule the engine validates', async () => {
    const result = await resolveRecheckConfig({
      block: { rules: { 'custom/x': 'off' } },
      configDir,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const error = result.errors.find((e) =>
      e.message.includes("must have required property 'message'")
    );
    expect(error?.value).toMatchObject({ severity: 'off' });
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

  describe('default baseline discovery', () => {
    const tempDirs: string[] = [];

    function makeConfigDir(withBaselineFile: boolean): string {
      const dir = mkdtempSync(path.join(tmpdir(), 'recheck-baseline-'));
      tempDirs.push(dir);
      if (withBaselineFile) {
        writeFileSync(path.join(dir, DEFAULT_BASELINE_FILE), 'version: 1\nfiles: {}\n', 'utf8');
      }
      return dir;
    }

    afterEach(() => {
      for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
    });

    it('picks up the default baseline file next to redocly.yaml', async () => {
      const dir = makeConfigDir(true);
      const result = await resolveRecheckConfig({
        extends: ['recheck/markdown'],
        configDir: dir,
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.config.baselinePath).toBe(path.resolve(dir, DEFAULT_BASELINE_FILE));
    });

    it('leaves the baseline path undefined when no default file exists', async () => {
      const dir = makeConfigDir(false);
      const result = await resolveRecheckConfig({
        extends: ['recheck/markdown'],
        configDir: dir,
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.config.baselinePath).toBeUndefined();
    });
  });

  it('rejects a `baseline` key in the block', async () => {
    const result = await resolveRecheckConfig({
      extends: ['recheck/markdown'],
      block: { baseline: './custom-baseline.yaml' },
      configDir,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors).toEqual([
      {
        message:
          '`recheck.baseline` is not supported; the command reads `.redocly.recheck-baseline.yaml` next to `redocly.yaml`.',
        path: 'recheck.baseline',
      },
    ]);
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
      block: {
        apiDescriptions: { rules: { 'recheck/line-length': 'off' } },
      },
      configDir,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.apiDescriptionRules).toEqual({ 'recheck/line-length': 'off' });
  });

  it('reports an unknown preset by name', async () => {
    const result = await resolveRecheckConfig({ extends: ['recheck/nope'], configDir });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors[0].message).toContain('Unknown preset "recheck/nope"');
  });

  it('merges the block on top of the presets with the core merge', async () => {
    const result = await resolveRecheckConfig({
      extends: ['recheck/markdown'],
      block: {
        rules: { 'recheck/line-length': { assertions: { 'line-length': { lineLength: 120 } } } },
      },
      configDir,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    const rule = result.config.rules.find((entry) => entry.name === 'recheck/line-length');
    expect(rule?.severity).toBe('error');
    expect(rule?.assertions['line-length']).toEqual({ lineLength: 120 });
    expect(typeof rule?.message).toBe('string');
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
      block: { rules: 'typo' },
      configDir,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors).toEqual([
      { message: '`recheck.rules` must be an object', path: 'recheck.rules' },
    ]);
  });

  it('rejects a non-object `recheck` block instead of silently ignoring it', async () => {
    const result = await resolveRecheckConfig({
      block: 'recheck/markdown',
      configDir,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors).toEqual([{ message: '`recheck` must be an object', path: 'recheck' }]);
  });

  it('resolves an absent `recheck` block to an empty object', async () => {
    const result = await resolveRecheckConfig({ configDir });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.rules).toEqual([]);
  });

  it('leaves the shared preset entries unchanged', async () => {
    const result = await resolveRecheckConfig({
      extends: ['recheck/markdown'],
      configDir,
    });
    expect(result.success).toBe(true);
    expect(presets['recheck/markdown']).toEqual(buildMarkdownPreset());
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
    // A heading-scoped pattern token that starts with `^#` makes validate()
    // warn (see validate.ts's warnStalePatternPrefix).
    const result = await resolveRecheckConfig({
      block: {
        rules: {
          'custom/heading-pattern': {
            severity: 'error',
            message: 'x',
            scope: 'heading',
            assertions: { pattern: { tokens: ['^#+ \\w*ing'] } },
          },
        },
      },
      configDir,
      warn: (message) => warnings.push(message),
    });
    expect(result.success).toBe(true);
    expect(warnings.some((message) => message.includes("starts with '^#'"))).toBe(true);
  });
});
