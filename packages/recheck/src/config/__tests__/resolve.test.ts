import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { presetConfigs } from '../presets/index.js';
import { buildMarkdownPreset } from '../presets/markdown.js';
import { DEFAULT_BASELINE_FILE, resolveRecheckConfig } from '../resolve.js';
import { withPresets } from './with-presets.js';

const configDir = '/tmp/project';

describe('resolveRecheckConfig', () => {
  it('validates a block with a preset merged in', async () => {
    const result = await resolveRecheckConfig({
      block: withPresets(['recheck/markdown']),
      configDir,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.rules.length).toBeGreaterThan(40);
    expect(result.config.rules.some((rule) => rule.name === 'recheck/heading-style')).toBe(true);
  });

  it('applies a block rule object over the preset', async () => {
    const result = await resolveRecheckConfig({
      block: withPresets(['recheck/markdown'], {
        rules: { 'recheck/heading-style': { severity: 'warn' } },
      }),
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
      block: withPresets(['recheck/markdown'], { rules: { 'recheck/heading-style': 'off' } }),
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
        block: withPresets(['recheck/markdown']),
        configDir: dir,
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.config.baselinePath).toBe(path.resolve(dir, DEFAULT_BASELINE_FILE));
    });

    it('leaves the baseline path undefined when no default file exists', async () => {
      const dir = makeConfigDir(false);
      const result = await resolveRecheckConfig({
        block: withPresets(['recheck/markdown']),
        configDir: dir,
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.config.baselinePath).toBeUndefined();
    });
  });

  it('rejects a `baseline` key in the block', async () => {
    const result = await resolveRecheckConfig({
      block: withPresets(['recheck/markdown'], { baseline: './custom-baseline.yaml' }),
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
      block: withPresets(['recheck/markdown'], { markdoc: true }),
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
      block: presetConfigs.markdown.recheck,
      configDir,
    });
    expect(result.success).toBe(true);
    expect(presetConfigs.markdown.recheck.rules).toEqual(buildMarkdownPreset());
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

  it('applies apiDescriptions.rules onto the effective rules for descriptions', async () => {
    const result = await resolveRecheckConfig({
      block: withPresets(['recheck/markdown'], {
        apiDescriptions: {
          rules: {
            'recheck/line-length': 'off',
            'recheck/no-trailing-spaces': { severity: 'warn' },
          },
        },
      }),
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
      block: withPresets(['recheck/markdown'], {
        apiDescriptions: { rules: { 'recheck/nope': 'off' } },
      }),
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
      block: withPresets(['recheck/markdown'], {
        apiDescriptions: { rules: { 'recheck/line-length': 'eror' } },
      }),
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
      block: withPresets(['recheck/markdown'], {
        apiDescriptions: { rules: { 'recheck/line-length': { severity: 'loud' } } },
      }),
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
      block: withPresets(['recheck/markdown'], {
        apiDescriptions: {
          rules: { 'recheck/line-length': { severity: 'warn', message: 'Shorter.' } },
        },
      }),
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
      block: withPresets(['recheck/markdown'], { apiDescriptions: 'off' }),
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
      block: withPresets(['recheck/markdown'], {
        apiDescriptions: { rule: { 'recheck/line-length': 'off' } },
      }),
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
      block: withPresets(['recheck/markdown'], { apiDescriptions: { rules: 'off' } }),
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
      block: withPresets(['recheck/markdown'], { apiDescriptions: { rules: {} } }),
      configDir: process.cwd(),
    });
    expect(result.success).toBe(true);
  });
});
