import { join } from 'node:path';
import { outdent } from 'outdent';
import { describe, expect, it } from 'vitest';

import { lintConfig } from '../../lint.js';
import { createConfig, loadConfig } from '../load.js';
import type { Plugin } from '../types.js';

const fixtures = join(__dirname, 'fixtures', 'recheck-presets');

const lineLength = { severity: 'error' as const, assertions: { 'line-length': {} } };
const singleH1 = { severity: 'error' as const, assertions: { 'single-h1': {} } };
const repetition = {
  severity: 'warn' as const,
  message: 'Repeated',
  assertions: { repetition: {} },
};

// A stand-in for the plugin that `@redocly/recheck/presets` exports.
const recheckPlugin: Plugin = {
  id: 'recheck',
  configs: {
    markdown: {
      recheck: { rules: { 'recheck/line-length': lineLength, 'recheck/single-h1': singleH1 } },
    },
    prose: { recheck: { rules: { 'recheck/repetition': repetition } } },
  },
};

const withPreset = outdent`
  extends:
    - recommended
    - recheck/markdown
  recheck:
    rules:
      recheck/line-length: off
`;

describe('recheck presets in extends', () => {
  it('resolves a preset of the passed plugin and applies the block on top', async () => {
    const config = await createConfig(withPreset, { plugins: [recheckPlugin] });
    expect(config.recheck).toEqual({
      rules: {
        'recheck/line-length': { ...lineLength, severity: 'off' },
        'recheck/single-h1': singleH1,
      },
    });
    expect(config.resolvedConfig.rules?.['no-unresolved-refs']).toBeDefined();
  });

  it('merges in extends order', async () => {
    // The shared file turns `single-h1` off; the preset comes later and turns it back on.
    const config = await loadConfig({
      configPath: join(fixtures, 'extends-order', 'redocly.yaml'),
      plugins: [recheckPlugin],
    });
    expect(config.recheck.rules?.['recheck/single-h1']).toEqual(singleH1);
  });

  it('adds the presets of an api on top of the root presets', async () => {
    const config = await createConfig(
      outdent`
        extends:
          - recheck/markdown
        apis:
          main:
            root: ./openapi.yaml
            extends:
              - recheck/prose
      `,
      { plugins: [recheckPlugin] }
    );
    expect(Object.keys(config.recheck.rules ?? {})).toEqual([
      'recheck/line-length',
      'recheck/single-h1',
    ]);
    expect(Object.keys(config.forAlias('main').recheck.rules ?? {})).toEqual([
      'recheck/line-length',
      'recheck/single-h1',
      'recheck/repetition',
    ]);
  });

  it('skips recheck presets when no recheck plugin is passed', async () => {
    const config = await createConfig(withPreset);
    expect(config.recheck).toEqual({ rules: { 'recheck/line-length': 'off' } });
    expect(config.resolvedConfig.rules?.['no-unresolved-refs']).toBeDefined();
  });

  it('rejects an unknown preset name', async () => {
    await expect(
      createConfig('extends:\n  - recheck/nope\n', { plugins: [recheckPlugin] })
    ).rejects.toThrow("plugin recheck doesn't export config with name nope");
  });

  it('reads a file in a recheck folder as a shared config file', async () => {
    const config = await loadConfig({ configPath: join(fixtures, 'folder-file', 'redocly.yaml') });
    expect(config.recheck.rules).toEqual({ 'recheck/line-length': 'off' });
  });

  it('has an empty block by default', async () => {
    const config = await createConfig('extends:\n  - recommended\n');
    expect(config.recheck).toEqual({ rules: {} });
  });
});

describe('recheck block merge', () => {
  it('keeps the block rules out of the lint rules', async () => {
    const config = await createConfig(withPreset, { plugins: [recheckPlugin] });
    expect(config.resolvedConfig.rules).not.toHaveProperty('recheck/line-length');
    for (const rules of Object.values(config.rules)) {
      expect(rules).not.toHaveProperty('recheck/line-length');
    }
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
  it('rejects a user plugin that takes the reserved id', async () => {
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
