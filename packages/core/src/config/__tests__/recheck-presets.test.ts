import { presetBlocks } from '@redocly/recheck';
import { outdent } from 'outdent';
import { describe, expect, it } from 'vitest';

import { lintConfig } from '../../lint.js';
import { createConfig } from '../load.js';

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
    expect(config.resolvedConfig).not.toHaveProperty('recheckExtends');
  });

  it('merges assertion options per id and keeps the preset message', async () => {
    const config = await createConfig(outdent`
      extends:
        - recheck/markdown
      recheck:
        rules:
          recheck/line-length:
            assertions:
              line-length:
                max: 120
    `);
    const rule = config.recheck.rules?.['recheck/line-length'];
    expect(rule).toMatchObject({ severity: 'error', assertions: { 'line-length': { max: 120 } } });
    expect(typeof (rule as { message?: string }).message).toBe('string');
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

  it('keeps the preset rules when the block or its rules have the wrong type', async () => {
    const emptyRules = await createConfig(outdent`
      extends:
        - recheck/markdown
      recheck:
        rules:
    `);
    expect(emptyRules.recheck.rules?.['recheck/line-length']).toMatchObject({ severity: 'error' });

    const stringBlock = await createConfig(outdent`
      extends:
        - recheck/markdown
      recheck: markdown
    `);
    expect(stringBlock.recheck).toEqual({ rules: presetBlocks.markdown.rules });
  });

  it('does not change the shared preset entries', async () => {
    await createConfig(withPreset);
    expect(presetBlocks.markdown.rules?.['recheck/line-length']).toMatchObject({
      severity: 'error',
    });
  });

  it('loads the recheck plugin only when extends names one of its configs', async () => {
    const plain = await createConfig('extends:\n  - recommended\n');
    expect(plain.plugins.find((plugin) => plugin.id === 'recheck')).toBeUndefined();
    expect(plain.recheck).toEqual({ rules: {} });

    const named = await createConfig(withPreset);
    expect(named.plugins.find((plugin) => plugin.id === 'recheck')).toBeDefined();
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
