import { join } from 'node:path';
import { outdent } from 'outdent';
import { describe, expect, it } from 'vitest';

import { lintConfig } from '../../lint.js';
import { createConfig, loadConfig } from '../load.js';

const fixtures = join(__dirname, 'fixtures', 'recheck-presets');

const withPreset = outdent`
  extends:
    - recommended
    - recheck/markdown
  recheck:
    rules:
      recheck/line-length: off
`;

describe('recheck presets in extends', () => {
  it('sets the recheck presets aside in order and keeps the API presets', async () => {
    const config = await createConfig(withPreset);
    expect(config.recheckExtends).toEqual(['recheck/markdown']);
    expect(config.resolvedConfig.rules?.['no-unresolved-refs']).toBeDefined();
    expect(config.plugins.find((plugin) => plugin.id === 'recheck')).toBeUndefined();
  });

  it('keeps the order across a shared config file', async () => {
    const config = await loadConfig({ configPath: join(fixtures, 'shared-order', 'redocly.yaml') });
    expect(config.recheckExtends).toEqual(['recheck/google', 'recheck/markdown', 'recheck/prose']);
  });

  it('keeps the last listing of a repeated preset', async () => {
    const config = await createConfig(outdent`
      extends:
        - recheck/markdown
        - recheck/markdown-relaxed
        - recheck/markdown
    `);
    expect(config.recheckExtends).toEqual(['recheck/markdown-relaxed', 'recheck/markdown']);
  });

  it('collects a preset named under an api on that api', async () => {
    const config = await createConfig(outdent`
      apis:
        main:
          root: ./openapi.yaml
          extends:
            - recheck/markdown
    `);
    expect(config.recheckExtends).toEqual([]);
    expect(config.forAlias('main').recheckExtends).toEqual(['recheck/markdown']);
  });

  it('puts the root presets before the presets of an api', async () => {
    const config = await createConfig(outdent`
      extends:
        - recheck/markdown
      apis:
        main:
          root: ./openapi.yaml
          extends:
            - recheck/prose
        other:
          root: ./other.yaml
    `);
    expect(config.forAlias('main').recheckExtends).toEqual(['recheck/markdown', 'recheck/prose']);
    expect(config.forAlias('other').recheckExtends).toEqual(['recheck/markdown']);
  });

  it('keeps the last listing of a preset that the root and an api both list', async () => {
    const config = await createConfig(outdent`
      extends:
        - recheck/markdown
      apis:
        main:
          root: ./openapi.yaml
          extends:
            - recheck/markdown-relaxed
            - recheck/markdown
    `);
    expect(config.forAlias('main').recheckExtends).toEqual([
      'recheck/markdown-relaxed',
      'recheck/markdown',
    ]);
  });

  it('reads a file in a recheck folder as a shared config file', async () => {
    const config = await loadConfig({ configPath: join(fixtures, 'folder-file', 'redocly.yaml') });
    expect(config.recheckExtends).toEqual([]);
    expect(config.recheck.rules).toEqual({ 'recheck/line-length': 'off' });
  });

  it('has no recheck presets and an empty block by default', async () => {
    const config = await createConfig('extends:\n  - recommended\n');
    expect(config.recheckExtends).toEqual([]);
    expect(config.recheck).toEqual({ rules: {} });
    expect(config.resolvedConfig).not.toHaveProperty('recheckExtends');
  });
});

describe('recheck block merge', () => {
  it('carries the user block through', async () => {
    const config = await createConfig(withPreset);
    expect(config.recheck).toEqual({ rules: { 'recheck/line-length': 'off' } });
  });

  it('merges a shared block by rule key and assigns settings', async () => {
    const config = await loadConfig({ configPath: join(fixtures, 'block-merge', 'redocly.yaml') });
    expect(config.recheck).toEqual({
      rules: {
        'recheck/line-length': { severity: 'warn', assertions: { 'line-length': { max: 120 } } },
      },
      markdoc: true,
    });
  });

  it('carries a block that is not an object to the engine', async () => {
    const config = await createConfig('extends:\n  - recommended\nrecheck: 5\n');
    expect(config.recheck as unknown).toBe(5);
  });
});

describe('recheck plugin id', () => {
  it('rejects a plugin that takes the reserved id', async () => {
    await expect(createConfig({ plugins: [{ id: 'recheck' }] })).rejects.toThrow('is reserved');
  });
});

describe('check-config', () => {
  it('accepts the block and rejects extends inside it', async () => {
    const accepted = await createConfig(withPreset);
    expect(await lintConfig({ config: accepted })).toEqual([]);
    const rejected = await createConfig('recheck:\n  extends: [recheck/markdown]\n');
    const problems = await lintConfig({ config: rejected });
    expect(problems.map((problem) => problem.message)).toEqual([
      expect.stringContaining('Property `extends` is not expected here'),
    ]);
  });
});
