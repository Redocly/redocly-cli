import { loadConfig } from '../load';
import { RedoclyClient } from '../../redocly';

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
