import { outdent } from 'outdent';
import { describe, expect, it } from 'vitest';

import { lintConfig } from '../../lint.js';
import { createConfig } from '../load.js';
import { isRecheckPreset } from '../utils.js';

const withRecheck = outdent`
  extends:
    - recommended
    - recheck/markdown
  recheck:
    rules:
      recheck/line-length: off
    baseline: ./recheck-baseline.yaml
`;

describe('recheck namespace in extends', () => {
  it('recognizes the prefix', () => {
    expect(isRecheckPreset('recheck/markdown')).toBe(true);
    expect(isRecheckPreset('recommended')).toBe(false);
    expect(isRecheckPreset('my-plugin/recheck')).toBe(false);
  });

  it('sets recheck/* entries aside and still resolves API presets', async () => {
    const config = await createConfig(withRecheck);
    expect(config.resolvedConfig.recheckExtends).toEqual(['recheck/markdown']);
    // `recommended` still applied: a rule it enables is present.
    expect(config.resolvedConfig.rules?.['no-unresolved-refs']).toBeDefined();
  });

  it('carries the raw recheck block through', async () => {
    const config = await createConfig(withRecheck);
    expect(config.resolvedConfig.recheck).toEqual({
      rules: { 'recheck/line-length': 'off' },
      baseline: './recheck-baseline.yaml',
    });
  });

  it('check-config accepts the block and rejects extends inside it', async () => {
    const accepted = await createConfig(withRecheck);
    const okProblems = await lintConfig({ config: accepted });
    expect(okProblems).toEqual([]);

    const rejected = await createConfig(outdent`
      recheck:
        extends: [recheck/markdown]
    `);
    const problems = await lintConfig({ config: rejected });
    expect(problems.map((p) => p.message)).toEqual([
      expect.stringContaining('Property `extends` is not expected here'),
    ]);
  });
});
