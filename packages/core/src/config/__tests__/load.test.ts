import { loadConfig } from '../load';
import { RedoclyClient } from '../../redocly';

describe('loadConfig', () => {
  beforeAll(() => {
    jest.spyOn(RedoclyClient.prototype, 'getTokens').mockImplementation(
      () => Promise.resolve([{ region: 'us', token: "accessToken", valid: true }])
    );
  });

  it('should resolve config http header by US region', async () => {
    const config = await loadConfig();
    expect(config.resolve.http.headers).toStrictEqual([{
      "matches": 'https://api.redoc.ly/registry/**',
      "name": "Authorization",
      "envVariable": undefined,
      "value": "accessToken"
    }]);
  });
});
