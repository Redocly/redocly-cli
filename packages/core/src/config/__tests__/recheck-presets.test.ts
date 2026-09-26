import type { RecheckConfig } from '@redocly/config';
import { presetConfigs, resolveRecheckConfig } from '@redocly/recheck';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';
import { describe, expect, it } from 'vitest';

import { lintConfig } from '../../lint.js';
import { createConfig, loadConfig } from '../load.js';
import { mergeExtends } from '../utils.js';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures/recheck-presets'
);

const withPreset = outdent`
  extends:
    - recommended
    - recheck/markdown
  recheck:
    rules:
      recheck/line-length: off
`;

describe('recheck presets in extends', () => {
  it('merges the preset into the recheck block and keeps the API presets', async () => {
    const config = await createConfig(withPreset);
    expect(config.recheck.rules?.['recheck/line-length']).toMatchObject({
      severity: 'off',
      assertions: { 'line-length': {} },
    });
    expect(config.recheck.rules?.['recheck/no-trailing-spaces']).toMatchObject({
      severity: 'error',
    });
    expect(config.resolvedConfig.rules?.['no-unresolved-refs']).toBeDefined();
    expect(Object.keys(config.resolvedConfig).filter((key) => key.startsWith('recheck'))).toEqual([
      'recheck',
    ]);
  });

  it('merges assertion options per id and resolves the default message', async () => {
    const config = await createConfig(outdent`
      extends:
        - recheck/markdown
      recheck:
        rules:
          recheck/line-length:
            assertions:
              line-length:
                lineLength: 120
    `);
    const rule = config.recheck.rules?.['recheck/line-length'];
    expect(rule).toMatchObject({
      severity: 'error',
      assertions: { 'line-length': { lineLength: 120 } },
    });
    const resolved = await resolveRecheckConfig({ block: config.recheck, configDir: fixturesDir });
    expect(resolved.success).toBe(true);
    if (!resolved.success) return;
    const lineLength = resolved.config.rules.find((entry) => entry.name === 'recheck/line-length');
    expect(lineLength).toMatchObject({
      message: 'Line length',
      assertions: { 'line-length': { lineLength: 120 } },
    });
  });

  it('lets a later preset override an earlier one', async () => {
    const config = await createConfig(outdent`
      extends:
        - recheck/markdown
        - recheck/markdown-relaxed
    `);
    expect(config.recheck.rules?.['recheck/no-trailing-spaces']).toMatchObject({ severity: 'off' });
  });

  it('keeps the block settings beside the rules', async () => {
    const config = await createConfig(outdent`
      extends:
        - recheck/markdown
      recheck:
        markdoc: true
        excludes:
          - drafts/**
    `);
    expect(config.recheck.markdoc).toBe(true);
    expect(config.recheck.excludes).toEqual(['drafts/**']);
  });

  it('keeps the preset rules when `rules` has the wrong type', async () => {
    const emptyRules = await createConfig(outdent`
      extends:
        - recheck/markdown
      recheck:
        rules:
    `);
    expect(emptyRules.recheck.rules?.['recheck/line-length']).toMatchObject({ severity: 'error' });
  });

  it('carries a block that is not an object to the engine', async () => {
    const config = await createConfig(outdent`
      extends:
        - recheck/markdown
      recheck: 5
    `);
    expect(config.recheck as unknown).toEqual(5);

    const later = mergeExtends([
      { recheck: 5 as unknown as RecheckConfig },
      { recheck: { rules: { 'recheck/line-length': 'off' } } },
    ]);
    expect(later.recheck as unknown).toEqual(5);
  });

  it('does not change the shared preset entries', async () => {
    await createConfig(withPreset);
    expect(presetConfigs.markdown.recheck.rules?.['recheck/line-length']).toMatchObject({
      severity: 'error',
    });
  });

  it('registers the built-in recheck plugin for every config', async () => {
    const plain = await createConfig('extends:\n  - recommended\n');
    expect(plain.plugins.find((plugin) => plugin.id === 'recheck')).toBeDefined();
    expect(plain.recheck).toEqual({ rules: {} });
  });

  it('resolves a recheck preset from a shared config file', async () => {
    const config = await loadConfig({ configPath: path.join(fixturesDir, 'redocly.yaml') });
    expect(config.recheck.rules?.['recheck/no-trailing-spaces']).toMatchObject({
      severity: 'error',
    });
  });

  it('resolves a recheck preset in a scorecard level', async () => {
    const config = await createConfig(outdent`
      scorecard:
        levels:
          - name: Baseline
            extends:
              - recheck/markdown
    `);
    expect(config.plugins.find((plugin) => plugin.id === 'recheck')).toBeDefined();
    expect(config.recheck).toEqual({ rules: {} });
  });

  it('keeps the recheck plugin when plugin evaluation is skipped', async () => {
    const config = await loadConfig({
      configPath: path.join(fixturesDir, 'redocly.yaml'),
      skipPluginEval: true,
    });
    expect(config.plugins.find((plugin) => plugin.id === 'recheck')).toBeDefined();
  });

  it('rejects a plugin that takes the built-in id', async () => {
    await expect(createConfig({ plugins: [{ id: 'recheck' }] })).rejects.toThrow(
      'belongs to a built-in plugin'
    );
  });

  it('reports an unknown recheck preset', async () => {
    await expect(createConfig('extends:\n  - recheck/nope\n')).rejects.toThrow(
      "doesn't export config with name nope"
    );
  });

  it('check-config accepts the block and rejects extends inside it', async () => {
    const accepted = await createConfig(withPreset);
    expect(await lintConfig({ config: accepted })).toEqual([]);

    const rejected = await createConfig(outdent`
      recheck:
        extends: [recheck/markdown]
    `);
    const problems = await lintConfig({ config: rejected });
    expect(problems.map((problem) => problem.message)).toEqual([
      expect.stringContaining('Property `extends` is not expected here'),
    ]);
  });
});
