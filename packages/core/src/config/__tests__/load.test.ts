import { loadConfig, findConfig, getConfig, createConfig } from '../load.js';
import { type Config } from '../config.js';
import { lintConfig } from '../../lint.js';
import { replaceSourceWithRef } from '../../../__tests__/utils.js';
import { type RuleConfig, type RawUniversalConfig } from './../types.js';
import { BaseResolver } from '../../resolve.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return { ...actual };
});
vi.mock('node:path', async () => {
  const actual = await vi.importActual('node:path');
  return { ...actual };
});

describe('loadConfig', () => {
  it('should call callback if such passed', async () => {
    const mockFn = vi.fn();
    await loadConfig({
      configPath: path.join(__dirname, './fixtures/load-redocly.yaml'),
      processRawConfig: mockFn,
    });
    expect(mockFn).toHaveBeenCalled();
  });

  it('should load config and lint it', async () => {
    const config = await loadConfig({
      configPath: path.join(__dirname, './fixtures/resolve-refs-in-config/config-with-refs.yaml'),
    });
    const problems = await lintConfig({ severity: 'warn', config });

    expect(replaceSourceWithRef(problems, __dirname)).toMatchInlineSnapshot(`
      [
        {
          "from": {
            "pointer": "#/seo",
            "source": "fixtures/resolve-refs-in-config/config-with-refs.yaml",
          },
          "location": [
            {
              "pointer": "#/title",
              "reportOnKey": false,
              "source": "fixtures/resolve-refs-in-config/seo.yaml",
            },
          ],
          "message": "Expected type \`string\` but got \`integer\`.",
          "ruleId": "configuration struct",
          "severity": "warn",
          "suggest": [],
        },
        {
          "from": {
            "pointer": "#/rules",
            "source": "fixtures/resolve-refs-in-config/config-with-refs.yaml",
          },
          "location": [
            {
              "pointer": "#/non-existing-rule",
              "reportOnKey": true,
              "source": "fixtures/resolve-refs-in-config/rules.yaml",
            },
          ],
          "message": "Property \`non-existing-rule\` is not expected here.",
          "ruleId": "configuration struct",
          "severity": "warn",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/theme",
              "reportOnKey": false,
              "source": "fixtures/resolve-refs-in-config/config-with-refs.yaml",
            },
          ],
          "message": "Can't resolve $ref: ENOENT: no such file or directory 'fixtures/resolve-refs-in-config/wrong-ref.yaml'",
          "ruleId": "configuration no-unresolved-refs",
          "severity": "warn",
          "suggest": [],
        },
      ]
    `);
    expect(config.rawConfig).toMatchInlineSnapshot(`
      {
        "rules": {
          "info-license": "error",
          "non-existing-rule": "warn",
        },
        "seo": {
          "title": 1,
        },
        "theme": undefined,
      }
    `);
  });

  it('should call externalRefResolver if such passed', async () => {
    const externalRefResolver = new BaseResolver();
    const resolverSpy = vi.spyOn(externalRefResolver, 'resolveDocument');
    await loadConfig({
      configPath: path.join(__dirname, './fixtures/load-external.yaml'),
      externalRefResolver,
    });
    expect(resolverSpy).toHaveBeenCalledWith(
      null,
      'https://raw.githubusercontent.com/Redocly/redocly-cli-cookbook/main/rulesets/spec-compliant/redocly.yaml'
    );
  });
});

describe('findConfig', () => {
  it('should find redocly.yaml', async () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((name) => name === 'redocly.yaml');
    const configName = findConfig();
    expect(configName).toStrictEqual('redocly.yaml');
  });
  it('should find .redocly.yaml', async () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((name) => name === '.redocly.yaml');
    const configName = findConfig();
    expect(configName).toStrictEqual('.redocly.yaml');
  });
  it('should throw an error when found multiple config files', async () => {
    vi.spyOn(fs, 'existsSync').mockImplementation(
      (name) => name === 'redocly.yaml' || name === '.redocly.yaml'
    );
    expect(findConfig).toThrow(`
      Multiple configuration files are not allowed.
      Found the following files: redocly.yaml, .redocly.yaml.
      Please use 'redocly.yaml' instead.
    `);
  });
  it('should find a nested config ', async () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((name) => name === 'dir/redocly.yaml');
    vi.spyOn(path, 'resolve').mockImplementationOnce((dir, name) => `${dir}/${name}`);
    const configName = findConfig('dir');
    expect(configName).toStrictEqual('dir/redocly.yaml');
  });
});

describe('getConfig', () => {
  it('should return empty object if there is no configPath and config file is not found', () => {
    expect(getConfig({})).toEqual(Promise.resolve({ rawConfig: {} }));
  });

  it('should resolve refs in config', async () => {
    const { rawConfig } = await getConfig({
      configPath: path.join(__dirname, './fixtures/resolve-refs-in-config/config-with-refs.yaml'),
    });
    expect(rawConfig).toEqual({
      seo: {
        title: 1,
      },
      rules: {
        'info-license': 'error',
        'non-existing-rule': 'warn',
      },
    });
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
    const rawConfig: RawUniversalConfig = {
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

  it('should create config from object with a custom plugin', async () => {
    const testCustomRule = vi.fn();
    const rawConfig: RawUniversalConfig = {
      extends: [],
      plugins: [
        {
          id: 'my-plugin',
          rules: {
            oas3: {
              'test-rule': testCustomRule,
            },
          },
        },
      ],
      rules: {
        'my-plugin/test-rule': 'error',
      },
    };
    const config = await createConfig(rawConfig);

    expect(config.plugins[0]).toEqual({
      id: 'my-plugin',
      rules: {
        oas3: {
          'my-plugin/test-rule': testCustomRule,
        },
      },
    });
    expect(config.rules.oas3_0).toEqual({
      'my-plugin/test-rule': 'error',
    });
  });

  it('should create a config with the apis section', async () => {
    const testConfig: Config = await createConfig(
      {
        apis: {
          'test@v1': {
            root: 'resources/pets.yaml',
            rules: {
              'operation-summary': 'warn',
              'rule/test': 'warn',
            },
          },
        },
        rules: {
          'operation-summary': 'error',
          'no-empty-servers': 'error',
          'rule/test': {
            subject: {
              type: 'Operation',
              property: 'x-test',
            },
            assertions: {
              defined: true,
            },
          },
        },
        telemetry: 'on',
        resolve: { http: { headers: [] } },
      },
      {
        configPath: 'redocly.yaml',
      }
    );
    // clean absolute paths and not needed fields
    testConfig.plugins = [];
    testConfig.extendPaths = [];
    testConfig.resolvedConfig.plugins = [];
    testConfig.resolvedConfig.extendPaths = [];
    testConfig.resolvedConfig.apis!['test@v1'].plugins = [];
    testConfig.resolvedConfig.apis!['test@v1'].extendPaths = [];

    expect(testConfig).toMatchSnapshot();
  });
});

function verifyExtendedConfig(
  config: Config,
  {
    extendsRuleSet,
    overridesRules,
  }: { extendsRuleSet: string; overridesRules: Record<string, RuleConfig> }
) {
  const defaultPlugin = config.plugins.find((plugin) => plugin.id === '');
  expect(defaultPlugin).toBeDefined();

  const recommendedRules = defaultPlugin?.configs?.[extendsRuleSet];
  expect(recommendedRules).toBeDefined();

  verifyOasRules(config.rules.oas2, overridesRules, {
    ...recommendedRules?.rules,
    ...recommendedRules?.oas2Rules,
  });

  verifyOasRules(config.rules.oas3_0, overridesRules, {
    ...recommendedRules?.rules,
    ...recommendedRules?.oas3_0Rules,
  });

  verifyOasRules(config.rules.oas3_1, overridesRules, {
    ...recommendedRules?.rules,
    ...recommendedRules?.oas3_1Rules,
  });
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
