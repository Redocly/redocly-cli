import { OasVersion } from '../../oas-types';
import { Config, StyleguideConfig } from '../config';
import { getMergedConfig } from '../utils';
import { doesYamlFileExist } from '../../utils';
import { parseYaml } from '../../js-yaml';
import { readFileSync } from 'fs';
import { ignoredFileStub } from './fixtures/ingore-file';
import * as path from 'path';
import { NormalizedProblem } from '../../walk';
import { Source } from '../../resolve';

jest.mock('../../utils');
jest.mock('../../js-yaml');
jest.mock('fs');

const testConfig: Config = {
  rawConfig: {
    apis: {
      'test@v1': {
        root: 'resources/pets.yaml',
        styleguide: { rules: { 'operation-summary': 'warn' } },
      },
    },
    organization: 'redocly-test',
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
  organization: 'redocly-test',
  files: [],
};

describe('getMergedConfig', () => {
  it('should get styleguide defined in "apis" section', () => {
    expect(getMergedConfig(testConfig, 'test@v1')).toMatchInlineSnapshot(`
      Config {
        "apis": Object {
          "test@v1": Object {
            "root": "resources/pets.yaml",
            "styleguide": Object {
              "rules": Object {
                "operation-summary": "warn",
              },
            },
          },
        },
        "configFile": "redocly.yaml",
        "files": Array [],
        "organization": "redocly-test",
        "rawConfig": Object {
          "apis": Object {
            "test@v1": Object {
              "root": "resources/pets.yaml",
              "styleguide": Object {
                "rules": Object {
                  "operation-summary": "warn",
                },
              },
            },
          },
          "files": Array [],
          "organization": "redocly-test",
          "styleguide": Object {
            "extendPaths": Array [],
            "pluginPaths": Array [],
            "rules": Object {
              "operation-summary": "warn",
            },
          },
          "theme": Object {},
        },
        "region": undefined,
        "resolve": Object {
          "http": Object {
            "customFetch": undefined,
            "headers": Array [],
          },
        },
        "styleguide": StyleguideConfig {
          "_usedRules": Set {},
          "_usedVersions": Set {},
          "configFile": "redocly.yaml",
          "decorators": Object {
            "oas2": Object {},
            "oas3_0": Object {},
            "oas3_1": Object {},
          },
          "doNotResolveExamples": false,
          "extendPaths": Array [],
          "ignore": Object {},
          "pluginPaths": Array [],
          "plugins": Array [],
          "preprocessors": Object {
            "oas2": Object {},
            "oas3_0": Object {},
            "oas3_1": Object {},
          },
          "rawConfig": Object {
            "extendPaths": Array [],
            "pluginPaths": Array [],
            "rules": Object {
              "operation-summary": "warn",
            },
          },
          "recommendedFallback": false,
          "rules": Object {
            "oas2": Object {
              "operation-summary": "warn",
            },
            "oas3_0": Object {
              "operation-summary": "warn",
            },
            "oas3_1": Object {
              "operation-summary": "warn",
            },
          },
        },
        "theme": Object {},
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
        "apis": Object {
          "test@v1": Object {
            "root": "resources/pets.yaml",
            "styleguide": Object {
              "rules": Object {
                "operation-summary": "warn",
              },
            },
          },
        },
        "configFile": "redocly.yaml",
        "files": Array [],
        "organization": "redocly-test",
        "rawConfig": Object {
          "apis": Object {
            "test@v1": Object {
              "root": "resources/pets.yaml",
              "styleguide": Object {
                "rules": Object {
                  "operation-summary": "warn",
                },
              },
            },
          },
          "files": Array [],
          "organization": "redocly-test",
          "styleguide": Object {
            "extendPaths": Array [],
            "pluginPaths": Array [],
            "plugins": Array [],
            "rules": Object {
              "no-empty-servers": "error",
              "operation-summary": "error",
            },
          },
          "theme": Object {},
        },
        "region": undefined,
        "resolve": Object {
          "http": Object {
            "customFetch": undefined,
            "headers": Array [],
          },
        },
        "styleguide": StyleguideConfig {
          "_usedRules": Set {},
          "_usedVersions": Set {},
          "configFile": "redocly.yaml",
          "decorators": Object {
            "oas2": Object {},
            "oas3_0": Object {},
            "oas3_1": Object {},
          },
          "doNotResolveExamples": false,
          "extendPaths": Array [],
          "ignore": Object {},
          "pluginPaths": Array [],
          "plugins": Array [],
          "preprocessors": Object {
            "oas2": Object {},
            "oas3_0": Object {},
            "oas3_1": Object {},
          },
          "rawConfig": Object {
            "extendPaths": Array [],
            "pluginPaths": Array [],
            "plugins": Array [],
            "rules": Object {
              "no-empty-servers": "error",
              "operation-summary": "error",
            },
          },
          "recommendedFallback": false,
          "rules": Object {
            "oas2": Object {
              "no-empty-servers": "error",
              "operation-summary": "error",
            },
            "oas3_0": Object {
              "no-empty-servers": "error",
              "operation-summary": "error",
            },
            "oas3_1": Object {
              "no-empty-servers": "error",
              "operation-summary": "error",
            },
          },
        },
        "theme": Object {},
      }
    `);
  });
});

describe('StyleguideConfig.extendTypes', () => {
  let oas3 = jest.fn();
  let oas2 = jest.fn();
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
    styleguideConfig.extendTypes({}, OasVersion.Version3_0);
    expect(oas3).toHaveBeenCalledTimes(1);
    expect(oas2).toHaveBeenCalledTimes(0);
  });
  it('should call only oas2 types extension', () => {
    const styleguideConfig = new StyleguideConfig(testRawConfigStyleguide);
    styleguideConfig.extendTypes({}, OasVersion.Version2);
    expect(oas3).toHaveBeenCalledTimes(0);
    expect(oas2).toHaveBeenCalledTimes(1);
  });
  it('should throw error if for oas version different from 2 and 3', () => {
    const styleguideConfig = new StyleguideConfig(testRawConfigStyleguide);
    expect(() => styleguideConfig.extendTypes({}, 'something else' as OasVersion)).toThrowError(
      'Not implemented'
    );
  });
});

describe('generation ignore object', () => {
  it('should generate config with absoluteUri for ignore', () => {
    (readFileSync as jest.Mock<any, any>).mockImplementationOnce(() => '');
    (parseYaml as jest.Mock<any, any>).mockImplementationOnce(() => ignoredFileStub);
    (doesYamlFileExist as jest.Mock<any, any>).mockImplementationOnce(() => true);

    jest.spyOn(path, 'resolve').mockImplementationOnce((_, filename) => `some-path/${filename}`);

    const styleguideConfig = new StyleguideConfig(testConfig.styleguide);

    expect(styleguideConfig).toMatchSnapshot();
  });
});
