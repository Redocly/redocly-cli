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
    expect(result.errors[0]).toEqual({
      path: 'recheck.rules.custom/x',
      message: "must have required property 'message'",
    });
  });

  it('reports a bad block setting at its block path', async () => {
    const result = await resolveRecheckConfig({ block: { excludes: 'x' }, configDir });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors[0].path).toBe('recheck.excludes');
    expect(result.errors[0].message).toMatch(/^must be array/);
  });

  it('reports a markdoc tagsFile error at its block path without repeating it', async () => {
    const result = await resolveRecheckConfig({
      block: { markdoc: { schema: 'realm', extend: { tagsFile: 'missing-tags.yaml' } } },
      configDir,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors[0].path).toBe('recheck.markdoc.extend.tagsFile');
    expect(result.errors[0].message).toMatch(/^could not read "/);
  });

  it('reports an unknown block key at the block root', async () => {
    const result = await resolveRecheckConfig({ block: { nope: 1 }, configDir });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors[0].path).toBe('recheck');
    expect(result.errors[0].message).toContain('unknown property "nope"');
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

  it.each(['recheck/nope', 'constructor'])(
    'reports the unknown preset %s by name',
    async (name) => {
      const result = await resolveRecheckConfig({ extends: [name], configDir });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.errors[0].message).toContain(`Unknown preset "${name}"`);
      expect(result.errors[0].path).toBe('extends');
    }
  );

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
    const error = result.errors.find((e) => e.message.includes('Unknown assertion type'));
    expect(error?.path).toBe('recheck.rules.custom/bad.assertions.no-such-assertion');
    expect(error?.message).toBe('Unknown assertion type "no-such-assertion"');
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
      block: {
        apiDescriptions: { rules: { 'recheck/nope': 'off' } },
      },
      configDir: process.cwd(),
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.map((error) => error.path)).toEqual([
      'recheck.apiDescriptions.rules.recheck/nope',
    ]);
  });

  it('rejects an apiDescriptions severity override with an unknown severity', async () => {
    const result = await resolveRecheckConfig({
      extends: ['recheck/markdown'],
      block: {
        apiDescriptions: { rules: { 'recheck/line-length': 'eror' } },
      },
      configDir: process.cwd(),
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors).toEqual([
      {
        message: '"recheck/line-length" has an unknown severity "eror"',
        path: 'recheck.apiDescriptions.rules.recheck/line-length',
      },
    ]);
  });

  it('rejects an apiDescriptions rule-object override with an unknown severity', async () => {
    const result = await resolveRecheckConfig({
      extends: ['recheck/markdown'],
      block: {
        apiDescriptions: { rules: { 'recheck/line-length': { severity: 'loud' } } },
      },
      configDir: process.cwd(),
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors).toEqual([
      {
        message: '"recheck/line-length" has an unknown severity "loud"',
        path: 'recheck.apiDescriptions.rules.recheck/line-length',
      },
    ]);
  });

  it('applies an apiDescriptions rule-object override with a valid severity', async () => {
    const result = await resolveRecheckConfig({
      extends: ['recheck/markdown'],
      block: {
        apiDescriptions: {
          rules: { 'recheck/line-length': { severity: 'warn', message: 'Shorter.' } },
        },
      },
      configDir: process.cwd(),
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    const descriptions = new Map(result.config.descriptionRules.map((rule) => [rule.name, rule]));
    expect(descriptions.get('recheck/line-length')).toMatchObject({
      severity: 'warn',
      message: 'Shorter.',
    });
  });

  it('rejects a non-object apiDescriptions block', async () => {
    const result = await resolveRecheckConfig({
      extends: ['recheck/markdown'],
      block: { apiDescriptions: 'off' },
      configDir: process.cwd(),
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors).toEqual([
      { message: '`recheck.apiDescriptions` must be an object', path: 'recheck.apiDescriptions' },
    ]);
  });

  it('rejects an unknown key in the apiDescriptions block', async () => {
    const result = await resolveRecheckConfig({
      extends: ['recheck/markdown'],
      block: {
        apiDescriptions: { rule: { 'recheck/line-length': 'off' } },
      },
      configDir: process.cwd(),
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors).toEqual([
      {
        message: '`recheck.apiDescriptions` has unknown keys: rule',
        path: 'recheck.apiDescriptions',
      },
    ]);
  });

  it('rejects a non-object apiDescriptions.rules block', async () => {
    const result = await resolveRecheckConfig({
      extends: ['recheck/markdown'],
      block: { apiDescriptions: { rules: 'off' } },
      configDir: process.cwd(),
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors).toEqual([
      {
        message: '`recheck.apiDescriptions.rules` must be an object',
        path: 'recheck.apiDescriptions.rules',
      },
    ]);
  });

  it('resolves an apiDescriptions block with an empty rules object', async () => {
    const result = await resolveRecheckConfig({
      extends: ['recheck/markdown'],
      block: { apiDescriptions: { rules: {} } },
      configDir: process.cwd(),
    });
    expect(result.success).toBe(true);
  });
});
