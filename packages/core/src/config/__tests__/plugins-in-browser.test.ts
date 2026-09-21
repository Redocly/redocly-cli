/**
 * @vitest-environment jsdom
 */

import { logger } from '../../logger.js';
import { createConfig } from '../load.js';
import type { Plugin } from '../types.js';

const RULE_WITH_PLUGIN_ASSERTION = {
  subject: { type: 'Operation', property: 'x-rateLimit' },
  where: [
    {
      subject: { type: 'Operation', property: 'security' },
      assertions: { defined: true, 'redocly/isEmptyArray': false },
    },
  ],
  assertions: { defined: true },
};
const RULE_WITHOUT_PLUGIN = {
  subject: { type: 'Operation', property: 'summary' },
  assertions: { defined: true },
};

const assertionIds = (rules: Record<string, unknown>) =>
  ((rules.assertions as { assertionId: string }[]) ?? []).map((assertion) => assertion.assertionId);

describe('config referencing plugins that are not evaluated in the browser', () => {
  beforeEach(() => {
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
  });

  it('skips a rule whose assertion function belongs to such a plugin', async () => {
    const config = await createConfig({
      plugins: ['./plugins/redocly-plugins.cjs'],
      rules: {
        'rule/rate-limit': RULE_WITH_PLUGIN_ASSERTION,
        'rule/summary': RULE_WITHOUT_PLUGIN,
        'operation-2xx-response': 'error',
      },
    });

    expect(assertionIds(config.rules.oas3_0)).toEqual(['rule/summary']);
    expect(config.rules.oas3_0['operation-2xx-response']).toBe('error');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('rule/rate-limit'));
  });

  it('skips such a rule in the apis section as well', async () => {
    const config = await createConfig({
      plugins: ['./plugins/redocly-plugins.cjs'],
      apis: {
        main: {
          root: 'openapi.yaml',
          rules: { 'rule/rate-limit': RULE_WITH_PLUGIN_ASSERTION, 'operation-summary': 'error' },
        },
      },
    });

    const mainRules = config.forAlias('main').rules.oas3_0;
    expect(assertionIds(mainRules)).toEqual([]);
    expect(mainRules['operation-summary']).toBe('error');
  });

  it('skips a preset of such a plugin and keeps the built-in ones', async () => {
    const config = await createConfig({
      plugins: ['./plugins/redocly-plugins.cjs'],
      extends: ['minimal', 'redocly/all'],
    });

    expect(config.rules.oas3_0['operation-operationId']).toBe('warn');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('redocly/all'));
  });

  it('keeps references to a plugin that is passed as an object', async () => {
    const plugin: Plugin = {
      id: 'redocly',
      assertions: { isEmptyArray: () => [] },
      configs: { all: { rules: { 'operation-4xx-response': 'warn' } } },
    };
    const config = await createConfig({
      plugins: [plugin],
      extends: ['redocly/all'],
      rules: { 'rule/rate-limit': RULE_WITH_PLUGIN_ASSERTION },
    });

    expect(assertionIds(config.rules.oas3_0)).toEqual(['rule/rate-limit']);
    expect(config.rules.oas3_0['operation-4xx-response']).toBe('warn');
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
