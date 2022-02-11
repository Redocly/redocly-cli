import { loadConfig, findConfig } from '../load';
import { RedoclyClient } from '../../redocly';

const fs = require('fs')

describe('loadConfig', () => {
  it('should resolve config http header by US region', async () => {
    jest.spyOn(RedoclyClient.prototype, 'getTokens').mockImplementation(
      () => Promise.resolve([{ region: 'us', token: "accessToken", valid: true }])
    );
    const config = await loadConfig();
    expect(config.resolve.http.headers).toStrictEqual([{
      "matches": 'https://api.redoc.ly/registry/**',
      "name": "Authorization",
      "envVariable": undefined,
      "value": "accessToken"
    }, {
      "matches": 'https://api.redocly.com/registry/**',
      "name": "Authorization",
      "envVariable": undefined,
      "value": "accessToken"
    }]);
  });

  it('should resolve config http header by EU region', async () => {
    jest.spyOn(RedoclyClient.prototype, 'getTokens').mockImplementation(
      () => Promise.resolve([{ region: 'eu', token: "accessToken", valid: true }])
    );
    const config = await loadConfig();
    expect(config.resolve.http.headers).toStrictEqual([{
      "matches": 'https://api.eu.redocly.com/registry/**',
      "name": "Authorization",
      "envVariable": undefined,
      "value": "accessToken"
    }]);
  });
});

describe('findConfig', () => {
  it('should find redocly.yaml', async () => {
    jest.spyOn(fs, 'existsSync').mockImplementation(
      name => name === 'redocly.yaml'
    );
    const configName = findConfig();
    expect(configName).toStrictEqual('redocly.yaml');
  });
  it('should find .redocly.yaml', async () => {
    jest.spyOn(fs, 'existsSync').mockImplementation(
      name => name === '.redocly.yaml'
    );
    const configName = findConfig();
    expect(configName).toStrictEqual('.redocly.yaml');
  });
  it('should throw an error when found multiple config files', async () => {
    jest.spyOn(fs, 'existsSync').mockImplementation(
      name => name === 'redocly.yaml' || name === '.redocly.yaml'
    );
    expect(findConfig).toThrow(`
      Multiple configuration files are not allowed. 
      Found the following files: redocly.yaml, .redocly.yaml. 
      Please use 'redocly.yaml' instead.
    `);
  });
});