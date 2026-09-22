import * as path from 'node:path';

import { createConfig, loadConfig } from '../load.js';

describe('config referencing plugins that are not listed in Node.js', () => {
  it('fails on an assertion function of a missing plugin', async () => {
    await expect(
      createConfig({
        rules: {
          'rule/rate-limit': {
            subject: { type: 'Operation', property: 'security' },
            assertions: { 'redocly/isEmptyArray': false },
          },
        },
      })
    ).rejects.toThrow("Plugin redocly isn't found.");
  });

  it('fails on a preset of a missing plugin', async () => {
    await expect(createConfig({ extends: ['redocly/all'] })).rejects.toThrow(
      'plugin redocly is not included'
    );
  });

  it('skips a rule of an unevaluated plugin when plugin evaluation is skipped', async () => {
    const configPath = path.join(__dirname, 'fixtures', 'skip-plugin-eval', 'redocly.yaml');
    const config = await loadConfig({ configPath, skipPluginEval: true });

    expect(config.rules.oas3_0.assertions).toBeUndefined();
    expect(config.rules.oas3_0['operation-description']).toBe('error');
  });
});
