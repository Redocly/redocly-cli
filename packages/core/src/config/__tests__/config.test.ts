import { SpecVersion } from '../../oas-types.js';
import { Config } from '../config.js';
import * as utils from '../../utils.js';
import * as jsYaml from '../../js-yaml/index.js';
import * as fs from 'node:fs';
import { ignoredFileStub } from './fixtures/ingore-file.js';
import * as path from 'node:path';
import { createConfig, type ResolvedConfig } from '../index.js';

vi.mock('../../js-yaml/index.js', async () => {
  const actual = await vi.importActual('../../js-yaml/index.js');
  return { ...actual };
});
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return { ...actual };
});
vi.mock('node:path', async () => {
  const actual = await vi.importActual('node:path');
  return { ...actual };
});

// Create the config and clean up not needed props for consistency
const testConfig: Config = await createConfig(
  {
    apis: {
      'test@v1': {
        root: 'resources/pets.yaml',
        rules: { 'operation-summary': 'warn' },
      },
    },
    telemetry: 'on',
    rules: { 'operation-summary': 'error', 'no-empty-servers': 'error' },
    resolve: { http: { headers: [] } },
  },
  {
    configPath: 'redocly.yaml',
  }
);
testConfig.plugins = [];

describe('Config.forAlias', () => {
  it('should get config instance for an alias defined in the "apis" section', () => {
    const aliasConfig = testConfig.forAlias('test@v1');
    expect(aliasConfig).toMatchInlineSnapshot(`
      Config {
        "_alias": "test@v1",
        "_usedRules": Set {},
        "_usedVersions": Set {},
        "configPath": "redocly.yaml",
        "decorators": {
          "arazzo1": {},
          "async2": {},
          "async3": {},
          "oas2": {},
          "oas3_0": {},
          "oas3_1": {},
          "overlay1": {},
        },
        "doNotResolveExamples": false,
        "document": {
          "parsed": {
            "apis": {
              "test@v1": {
                "root": "resources/pets.yaml",
                "rules": {
                  "operation-summary": "warn",
                },
              },
            },
            "resolve": {
              "http": {
                "headers": [],
              },
            },
            "rules": {
              "no-empty-servers": "error",
              "operation-summary": "error",
            },
            "telemetry": "on",
          },
          "source": Source {
            "absoluteRef": "redocly.yaml",
            "body": "",
            "mimeType": undefined,
          },
        },
        "ignore": {},
        "plugins": [],
        "preprocessors": {
          "arazzo1": {},
          "async2": {},
          "async3": {},
          "oas2": {},
          "oas3_0": {},
          "oas3_1": {},
          "overlay1": {},
        },
        "resolve": {
          "http": {
            "customFetch": undefined,
            "headers": [],
          },
        },
        "resolvedConfig": {
          "arazzo1Decorators": {},
          "arazzo1Preprocessors": {},
          "arazzo1Rules": {},
          "async2Decorators": {},
          "async2Preprocessors": {},
          "async2Rules": {},
          "async3Decorators": {},
          "async3Preprocessors": {},
          "async3Rules": {},
          "decorators": {},
          "oas2Decorators": {},
          "oas2Preprocessors": {},
          "oas2Rules": {},
          "oas3_0Decorators": {},
          "oas3_0Preprocessors": {},
          "oas3_0Rules": {},
          "oas3_1Decorators": {},
          "oas3_1Preprocessors": {},
          "oas3_1Rules": {},
          "overlay1Decorators": {},
          "overlay1Preprocessors": {},
          "overlay1Rules": {},
          "preprocessors": {},
          "root": "resources/pets.yaml",
          "rules": {
            "no-empty-servers": "error",
            "operation-summary": "warn",
          },
        },
        "resolvedRefMap": Map {},
        "rules": {
          "arazzo1": {
            "no-empty-servers": "error",
            "operation-summary": "warn",
          },
          "async2": {
            "no-empty-servers": "error",
            "operation-summary": "warn",
          },
          "async3": {
            "no-empty-servers": "error",
            "operation-summary": "warn",
          },
          "oas2": {
            "no-empty-servers": "error",
            "operation-summary": "warn",
          },
          "oas3_0": {
            "no-empty-servers": "error",
            "operation-summary": "warn",
          },
          "oas3_1": {
            "no-empty-servers": "error",
            "operation-summary": "warn",
          },
          "overlay1": {
            "no-empty-servers": "error",
            "operation-summary": "warn",
          },
        },
      }
    `);
  });
  it('should take into account a config file', () => {
    const aliasConfig = testConfig.forAlias('test@v1');
    expect(aliasConfig.configPath).toEqual('redocly.yaml');
  });
  it('should return the same config when there is no alias provided', () => {
    expect(testConfig.forAlias()).toEqual(testConfig);
  });
  it('should handle wrong alias - return the same governance config, empty features', () => {
    expect(testConfig.forAlias('wrong-alias')).toEqual(testConfig);
  });
});

describe('Config.extendTypes', () => {
  let oas3 = vi.fn();
  let oas2 = vi.fn();
  let plugins = [
    {
      id: 'test-types-plugin',
      typeExtension: {
        oas3,
        oas2,
      },
    },
  ];

  it('should call only oas3 types extension', () => {
    const config = new Config({}, { plugins });
    config.extendTypes({}, SpecVersion.OAS3_0);
    expect(oas3).toHaveBeenCalledTimes(1);
    expect(oas2).toHaveBeenCalledTimes(0);
  });
  it('should call only oas2 types extension', () => {
    const config = new Config({}, { plugins });
    config.extendTypes({}, SpecVersion.OAS2);
    expect(oas3).toHaveBeenCalledTimes(0);
    expect(oas2).toHaveBeenCalledTimes(1);
  });
  it('should throw error if for oas version different from 2 and 3', () => {
    const config = new Config({}, { plugins });
    expect(() => config.extendTypes({}, 'something else' as SpecVersion)).toThrowError(
      'Not implemented'
    );
  });
});

describe('generation ignore object', () => {
  it('should generate config with absoluteUri for ignore', () => {
    vi.spyOn(fs, 'readFileSync').mockImplementationOnce(() => '');
    vi.spyOn(jsYaml, 'parseYaml').mockImplementationOnce(() => ignoredFileStub);
    vi.spyOn(utils, 'doesYamlFileExist').mockImplementationOnce(() => true);
    vi.spyOn(path, 'resolve').mockImplementationOnce((_, filename) => `some-path/${filename}`);

    const config = new Config(testConfig.resolvedConfig);
    config.resolvedConfig = 'resolvedConfig stub' as any;

    expect(config).toMatchSnapshot();
  });
});
