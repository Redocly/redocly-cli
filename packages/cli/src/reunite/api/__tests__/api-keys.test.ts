import { getApiKeys } from '../api-keys.js';

describe('getApiKeys()', () => {
  afterEach(() => {
    process.env.REDOCLY_AUTHORIZATION = undefined;
  });

  it('should return api key from environment variable', () => {
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

    expect(getApiKeys()).toEqual('test-api-key');
  });

  it('should throw an error if no api key provided', () => {
    process.env.REDOCLY_AUTHORIZATION = '';

    expect(() => getApiKeys()).toThrowError(
      'No api key provided, please use environment variable REDOCLY_AUTHORIZATION.'
    );
  });
});
