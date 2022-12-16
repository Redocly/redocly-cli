import { loadConfig, findConfig, getConfig, createConfig } from '../load';
import { RedoclyClient } from '../../redocly';
import { RuleConfig, FlatRawConfig } from './../types';
import { Config } from '../config';

const fs = require('fs');
const path = require('path');

describe('loadConfig', () => {
  it('should resolve config http header by US region', async () => {
    jest
      .spyOn(RedoclyClient.prototype, 'getTokens')
      .mockImplementation(() =>
        Promise.resolve([{ region: 'us', token: 'accessToken', valid: true }])
      );
    const config = await loadConfig();
    expect(config.resolve.http.headers).toStrictEqual([
      {
        matches: 'https://api.redocly.com/registry/**',
        name: 'Authorization',
        envVariable: undefined,
        value: 'accessToken',
      },
      {
        matches: 'https://api.redoc.ly/registry/**',
        name: 'Authorization',
        envVariable: undefined,
        value: 'accessToken',
      },
    ]);
  });

  it('should resolve config http header by EU region', async () => {
    jest
      .spyOn(RedoclyClient.prototype, 'getTokens')
      .mockImplementation(() =>
        Promise.resolve([{ region: 'eu', token: 'accessToken', valid: true }])
      );
    const config = await loadConfig();
    expect(config.resolve.http.headers).toStrictEqual([
      {
        matches: 'https://api.eu.redocly.com/registry/**',
        name: 'Authorization',
        envVariable: undefined,
        value: 'accessToken',
      },
    ]);
  });

  it('should call callback if such passed', async () => {
    const mockFn = jest.fn();
    await loadConfig({
      configPath: path.join(__dirname, './fixtures/load-redocly.yaml'),
      processRawConfig: mockFn,
    });
    expect(mockFn).toHaveBeenCalled();
  });
});

describe('findConfig', () => {
  it('should find redocly.yaml', async () => {
    jest.spyOn(fs, 'existsSync').mockImplementation((name) => name === 'redocly.yaml');
    const configName = findConfig();
    expect(configName).toStrictEqual('redocly.yaml');
  });
  it('should find .redocly.yaml', async () => {
    jest.spyOn(fs, 'existsSync').mockImplementation((name) => name === '.redocly.yaml');
    const configName = findConfig();
    expect(configName).toStrictEqual('.redocly.yaml');
  });
  it('should throw an error when found multiple config files', async () => {
    jest
      .spyOn(fs, 'existsSync')
      .mockImplementation((name) => name === 'redocly.yaml' || name === '.redocly.yaml');
    expect(findConfig).toThrow(`
      Multiple configuration files are not allowed. 
      Found the following files: redocly.yaml, .redocly.yaml. 
      Please use 'redocly.yaml' instead.
    `);
  });
  it('should find a nested config ', async () => {
    jest.spyOn(fs, 'existsSync').mockImplementation((name) => name === 'dir/redocly.yaml');
    jest.spyOn(path, 'resolve').mockImplementationOnce((dir, name) => `${dir}/${name}`);
    const configName = findConfig('dir');
    expect(configName).toStrictEqual('dir/redocly.yaml');
  });
});

describe('getConfig', () => {
  jest.spyOn(fs, 'hasOwnProperty').mockImplementation(() => false);
  it('should return empty object if there is no configPath and config file is not found', () => {
    expect(getConfig()).toEqual(Promise.resolve({}));
  });
});

describe('createConfig', () => {
  it('should create config from string', async () => {
    const config = await createConfig(`
      extends:
      - recommended
      rules:
        info-license: off
    `);

    verifyExtendedConfig(config, {
      extendsRuleSet: 'recommended',
      overridesRules: { 'info-license': 'off' },
    });
  });

  it('should create config from object', async () => {
    const rawConfig: FlatRawConfig = {
      extends: ['minimal'],
      rules: {
        'info-license': 'off',
        'tag-description': 'off',
        'operation-2xx-response': 'off',
      },
    };
    const config = await createConfig(rawConfig);

    verifyExtendedConfig(config, {
      extendsRuleSet: 'minimal',
      overridesRules: rawConfig.rules as Record<string, RuleConfig>,
    });
  });
});

function verifyExtendedConfig(
  config: Config,
  {
    extendsRuleSet,
    overridesRules,
  }: { extendsRuleSet: string; overridesRules: Record<string, RuleConfig> }
) {
  const defaultPlugin = config.styleguide.plugins.find((plugin) => plugin.id === '');
  expect(defaultPlugin).toBeDefined();

  const recommendedRules = defaultPlugin?.configs?.[extendsRuleSet];
  expect(recommendedRules).toBeDefined();

  verifyOasRules(config.styleguide.rules.oas2, overridesRules, recommendedRules?.rules || {});
  verifyOasRules(
    config.styleguide.rules.oas3_0,
    overridesRules,
    Object.assign({}, recommendedRules?.rules, recommendedRules?.oas3_0Rules)
  );
  verifyOasRules(
    config.styleguide.rules.oas3_1,
    overridesRules,
    Object.assign({}, recommendedRules?.rules, recommendedRules?.oas3_1Rules)
  );
}

function verifyOasRules(
  finalRuleset: Record<string, RuleConfig>,
  overridesRules: Record<string, RuleConfig>,
  defaultRuleset: Record<string, RuleConfig>
) {
  Object.entries(finalRuleset).forEach(([ruleName, ruleValue]) => {
    if (ruleName in overridesRules) {
      expect(ruleValue).toBe(overridesRules[ruleName]);
    } else {
      expect(ruleValue).toBe(defaultRuleset[ruleName]);
    }
  });
}
