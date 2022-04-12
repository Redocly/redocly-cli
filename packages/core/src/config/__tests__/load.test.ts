import { loadConfig, findConfig, resolveNestedPlugins, getConfig } from '../load';
import { RedoclyClient } from '../../redocly';

const fs = require('fs');
const path = require('path');

describe('loadConfig', () => {
  it('should resolve config http header by US region', async () => {
    jest
      .spyOn(RedoclyClient.prototype, 'getTokens')
      .mockImplementation(() =>
        Promise.resolve([{ region: 'us', token: 'accessToken', valid: true }]),
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
        Promise.resolve([{ region: 'eu', token: 'accessToken', valid: true }]),
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

describe('resolveNestedPlugins', () => {
  const testData = {
    configPath: '/.redocly.yaml',
    pluginConfigPath: '/api/.redocly.yaml',
    plugin: 'plugins/test-plugin.js',
  };

  it('should resolve plugin path for same config name', () => {
    const path = resolveNestedPlugins(testData);
    expect(path).toStrictEqual('/api/plugins/test-plugin.js');
  });

  it('should resolve plugin path for different config name', () => {
    const path = resolveNestedPlugins({ ...testData, configPath: '/redocly.yaml' });
    expect(path).toStrictEqual('/api/plugins/test-plugin.js');
  });

  it('should resolve plugin path when plugin has same level like nested config path', () => {
    const path = resolveNestedPlugins({ ...testData, plugin: 'test-plugin.js' });
    expect(path).toStrictEqual('/api/test-plugin.js');
  });
});

describe('getConfig', () => {
  jest.spyOn(fs, 'hasOwnProperty').mockImplementation(() => false);
  it('should return empty object if there is no configPath', () => {
    expect(getConfig()).toEqual(Promise.resolve({}));
  });
});
