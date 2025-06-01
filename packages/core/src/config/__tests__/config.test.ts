import { SpecVersion } from '../../oas-types.js';
import { Config, StyleguideConfig } from '../config.js';
import { getMergedConfig } from '../utils.js';
import { doesYamlFileExist } from '../../utils.js';
import { parseYaml } from '../../js-yaml/index.js';
import { readFileSync } from 'node:fs';
import { ignoredFileStub } from './fixtures/ingore-file.js';
import * as path from 'node:path';

vi.mock('../../utils.js');
vi.mock('../../js-yaml/index.js');
vi.mock('node:fs');
vi.mock('node:path', async () => {
  const actual = await vi.importActual('node:path');
  return { ...actual };
});

const testConfig: Config = {
  rawConfig: {
    apis: {
      'test@v1': {
        root: 'resources/pets.yaml',
        styleguide: { rules: { 'operation-summary': 'warn' } },
      },
    },
    telemetry: 'on',
    styleguide: {
      rules: { 'operation-summary': 'error', 'no-empty-servers': 'error' },
      plugins: [],
    },
  },
  configFile: 'redocly.yaml',
  apis: {
    'test@v1': {
      root: 'resources/pets.yaml',
      styleguide: { rules: { 'operation-summary': 'warn' } },
    },
  },

  styleguide: {
    rawConfig: {
      rules: { 'operation-summary': 'error', 'no-empty-servers': 'error' },
      plugins: [],
    },
    configFile: 'redocly.yaml',
    ignore: {},
    _usedRules: new Set(),
    _usedVersions: new Set(),
    recommendedFallback: false,
    plugins: [],
    doNotResolveExamples: false,
    rules: {
      oas2: { 'operation-summary': 'error', 'no-empty-servers': 'error' },
      oas3_0: { 'operation-summary': 'error', 'no-empty-servers': 'error' },
      oas3_1: { 'operation-summary': 'error', 'no-empty-servers': 'error' },
    },
    preprocessors: { oas2: {}, oas3_0: {}, oas3_1: {} },
    decorators: { oas2: {}, oas3_0: {}, oas3_1: {} },
  } as unknown as StyleguideConfig,
  theme: {
    openapi: {},
    mockServer: {},
  },
  resolve: { http: { headers: [] } },
};

describe('getMergedConfig', () => {
  it('should get styleguide defined in "apis" section', () => {
    expect(getMergedConfig(testConfig, 'test@v1')).toMatchInlineSnapshot(`
      Config {
        "apis": {
          "test@v1": {
            "root": "resources/pets.yaml",
            "styleguide": {
              "rules": {
                "operation-summary": "warn",
              },
            },
          },
        },
        "configFile": "redocly.yaml",
        "rawConfig": {
          "apis": {
            "test@v1": {
              "root": "resources/pets.yaml",
              "styleguide": {
                "rules": {
                  "operation-summary": "warn",
                },
              },
            },
          },
          "styleguide": {
            "extendPaths": [],
            "pluginPaths": [],
            "rules": {
              "operation-summary": "warn",
            },
          },
          "telemetry": "on",
          "theme": {},
        },
        "resolve": {
          "http": {
            "customFetch": undefined,
            "headers": [],
          },
        },
        "styleguide": StyleguideConfig {
          "_usedRules": Set {},
          "_usedVersions": Set {},
          "configFile": "redocly.yaml",
          "decorators": {
            "arazzo1": {},
            "async2": {},
            "async3": {},
            "oas2": {},
            "oas3_0": {},
            "oas3_1": {},
            "oas3_2": {},
            "overlay1": {},
          },
          "doNotResolveExamples": false,
          "extendPaths": [],
          "ignore": {},
          "pluginPaths": [],
          "plugins": [],
          "preprocessors": {
            "arazzo1": {},
            "async2": {},
            "async3": {},
            "oas2": {},
            "oas3_0": {},
            "oas3_1": {},
            "oas3_2": {},
            "overlay1": {},
          },
          "rawConfig": {
            "extendPaths": [],
            "pluginPaths": [],
            "rules": {
              "operation-summary": "warn",
            },
          },
          "recommendedFallback": false,
          "rules": {
            "arazzo1": {
              "operation-summary": "warn",
            },
            "async2": {
              "operation-summary": "warn",
            },
            "async3": {
              "operation-summary": "warn",
            },
            "oas2": {
              "operation-summary": "warn",
            },
            "oas3_0": {
              "operation-summary": "warn",
            },
            "oas3_1": {
              "operation-summary": "warn",
            },
            "oas3_2": {
              "operation-summary": "warn",
            },
            "overlay1": {
              "operation-summary": "warn",
            },
          },
        },
        "telemetry": "on",
        "theme": {},
      }
    `);
  });
  it('should take into account a config file', () => {
    const result = getMergedConfig(testConfig, 'test@v1');
    expect(result.configFile).toEqual('redocly.yaml');
    expect(result.styleguide.configFile).toEqual('redocly.yaml');
  });
  it('should return the same config when there is no alias provided', () => {
    expect(getMergedConfig(testConfig)).toEqual(testConfig);
  });
  it('should handle wrong alias - return the same styleguide, empty features', () => {
    expect(getMergedConfig(testConfig, 'wrong-alias')).toMatchInlineSnapshot(`
      Config {
        "apis": {
          "test@v1": {
            "root": "resources/pets.yaml",
            "styleguide": {
              "rules": {
                "operation-summary": "warn",
              },
            },
          },
        },
        "configFile": "redocly.yaml",
        "rawConfig": {
          "apis": {
            "test@v1": {
              "root": "resources/pets.yaml",
              "styleguide": {
                "rules": {
                  "operation-summary": "warn",
                },
              },
            },
          },
          "styleguide": {
            "extendPaths": [],
            "pluginPaths": [],
            "plugins": [],
            "rules": {
              "no-empty-servers": "error",
              "operation-summary": "error",
            },
          },
          "telemetry": "on",
          "theme": {},
        },
        "resolve": {
          "http": {
            "customFetch": undefined,
            "headers": [],
          },
        },
        "styleguide": StyleguideConfig {
          "_usedRules": Set {},
          "_usedVersions": Set {},
          "configFile": "redocly.yaml",
          "decorators": {
            "arazzo1": {},
            "async2": {},
            "async3": {},
            "oas2": {},
            "oas3_0": {},
            "oas3_1": {},
            "oas3_2": {},
            "overlay1": {},
          },
          "doNotResolveExamples": false,
          "extendPaths": [],
          "ignore": {},
          "pluginPaths": [],
          "plugins": [],
          "preprocessors": {
            "arazzo1": {},
            "async2": {},
            "async3": {},
            "oas2": {},
            "oas3_0": {},
            "oas3_1": {},
            "oas3_2": {},
            "overlay1": {},
          },
          "rawConfig": {
            "extendPaths": [],
            "pluginPaths": [],
            "plugins": [],
            "rules": {
              "no-empty-servers": "error",
              "operation-summary": "error",
            },
          },
          "recommendedFallback": false,
          "rules": {
            "arazzo1": {
              "no-empty-servers": "error",
              "operation-summary": "error",
            },
            "async2": {
              "no-empty-servers": "error",
              "operation-summary": "error",
            },
            "async3": {
              "no-empty-servers": "error",
              "operation-summary": "error",
            },
            "oas2": {
              "no-empty-servers": "error",
              "operation-summary": "error",
            },
            "oas3_0": {
              "no-empty-servers": "error",
              "operation-summary": "error",
            },
            "oas3_1": {
              "no-empty-servers": "error",
              "operation-summary": "error",
            },
            "oas3_2": {
              "no-empty-servers": "error",
              "operation-summary": "error",
            },
            "overlay1": {
              "no-empty-servers": "error",
              "operation-summary": "error",
            },
          },
        },
        "telemetry": "on",
        "theme": {},
      }
    `);
  });
});

describe('StyleguideConfig.extendTypes', () => {
  let oas3 = vi.fn();
  let oas2 = vi.fn();
  let testRawConfigStyleguide = {
    plugins: [
      {
        id: 'test-types-plugin',
        typeExtension: {
          oas3,
          oas2,
        },
      },
    ],
  };
  it('should call only oas3 types extension', () => {
    const styleguideConfig = new StyleguideConfig(testRawConfigStyleguide);
    styleguideConfig.extendTypes({}, SpecVersion.OAS3_0);
    expect(oas3).toHaveBeenCalledTimes(1);
    expect(oas2).toHaveBeenCalledTimes(0);
  });
  it('should call only oas2 types extension', () => {
    const styleguideConfig = new StyleguideConfig(testRawConfigStyleguide);
    styleguideConfig.extendTypes({}, SpecVersion.OAS2);
    expect(oas3).toHaveBeenCalledTimes(0);
    expect(oas2).toHaveBeenCalledTimes(1);
  });
  it('should throw error if for oas version different from 2 and 3', () => {
    const styleguideConfig = new StyleguideConfig(testRawConfigStyleguide);
    expect(() => styleguideConfig.extendTypes({}, 'something else' as SpecVersion)).toThrowError(
      'Not implemented'
    );
  });
});

describe('generation ignore object', () => {
  it('should generate config with absoluteUri for ignore', () => {
    vi.mocked(readFileSync).mockImplementationOnce(() => '');
    vi.mocked(parseYaml).mockImplementationOnce(() => ignoredFileStub);
    vi.mocked(doesYamlFileExist).mockImplementationOnce(() => true);

    vi.spyOn(path, 'resolve').mockImplementationOnce((_, filename) => `some-path/${filename}`);

    const styleguideConfig = new StyleguideConfig(testConfig.styleguide);

    expect(styleguideConfig).toMatchSnapshot();
  });
});
