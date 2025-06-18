import { SpecVersion } from '../../oas-types.js';
import { type Config, NormalizedGovernanceConfig } from '../config.js';
import * as utils from '../../utils.js';
import * as jsYaml from '../../js-yaml/index.js';
import * as fs from 'node:fs';
import { ignoredFileStub } from './fixtures/ingore-file.js';
import * as path from 'node:path';
import { createConfig, getGovernanceConfig, ResolvedConfig } from '../index.js';

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
getGovernanceConfig(testConfig).plugins = [];
getGovernanceConfig(testConfig, 'test@v1').plugins = [];
testConfig.resolvedConfig.plugins = [];
getGovernanceConfig(testConfig).extendPaths = [];
getGovernanceConfig(testConfig, 'test@v1').extendPaths = [];
testConfig.resolvedConfig.extendPaths = [];

describe('getGovernanceConfig', () => {
  it('should get normalized governance config defined in the "apis" section', () => {
    expect(getGovernanceConfig(testConfig, 'test@v1')).toMatchInlineSnapshot(`
      NormalizedGovernanceConfig {
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
          "overlay1": {},
        },
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
    const result = getGovernanceConfig(testConfig, 'test@v1');
    expect(result.configPath).toEqual('redocly.yaml');
  });
  it('should return the same config when there is no alias provided', () => {
    expect(getGovernanceConfig(testConfig)).toEqual(testConfig._governance.root);
  });
  it('should handle wrong alias - return the same governance config, empty features', () => {
    expect(getGovernanceConfig(testConfig, 'wrong-alias')).toEqual(testConfig._governance.root);
  });
});

describe('NormalizedGovernanceConfig.extendTypes', () => {
  let oas3 = vi.fn();
  let oas2 = vi.fn();
  let testResolvedConfig: ResolvedConfig = {
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
    const governanceConfig = new NormalizedGovernanceConfig(testResolvedConfig);
    governanceConfig.extendTypes({}, SpecVersion.OAS3_0);
    expect(oas3).toHaveBeenCalledTimes(1);
    expect(oas2).toHaveBeenCalledTimes(0);
  });
  it('should call only oas2 types extension', () => {
    const governanceConfig = new NormalizedGovernanceConfig(testResolvedConfig);
    governanceConfig.extendTypes({}, SpecVersion.OAS2);
    expect(oas3).toHaveBeenCalledTimes(0);
    expect(oas2).toHaveBeenCalledTimes(1);
  });
  it('should throw error if for oas version different from 2 and 3', () => {
    const governanceConfig = new NormalizedGovernanceConfig(testResolvedConfig);
    expect(() => governanceConfig.extendTypes({}, 'something else' as SpecVersion)).toThrowError(
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

    const governanceConfig = new NormalizedGovernanceConfig(testConfig.resolvedConfig);

    expect(governanceConfig).toMatchSnapshot();
  });
});
