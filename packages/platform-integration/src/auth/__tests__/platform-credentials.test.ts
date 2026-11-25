import { RedoclyOAuthClient } from '../oauth-client.js';
import { getPlatformCredentials } from '../platform-credentials.js';

vi.mock('../oauth-client.js');

describe('getPlatformCredentials', () => {
  const getAccessToken = vi.fn();

  beforeEach(() => {
    vi.stubEnv('REDOCLY_AUTHORIZATION', '');
    getAccessToken.mockResolvedValue('token');
    vi.mocked(RedoclyOAuthClient).mockImplementation(function (this: any) {
      this.getAccessToken = getAccessToken;
    } as any);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prefers the API key from REDOCLY_AUTHORIZATION', async () => {
    vi.stubEnv('REDOCLY_AUTHORIZATION', 'sk_1');

    await expect(getPlatformCredentials('https://app.cloud.redocly.com', '2.0.0')).resolves.toEqual(
      { apiKey: 'sk_1' }
    );
    expect(getAccessToken).not.toHaveBeenCalled();
  });

  it('falls back to the login token of the platform URL', async () => {
    await expect(getPlatformCredentials('https://app.cloud.redocly.com', '2.0.0')).resolves.toEqual(
      { accessToken: 'token' }
    );
    expect(RedoclyOAuthClient).toHaveBeenCalledWith('2.0.0');
    expect(getAccessToken).toHaveBeenCalledWith('https://app.cloud.redocly.com');
  });

  it('is undefined without an API key or a login', async () => {
    getAccessToken.mockResolvedValue(null);

    await expect(
      getPlatformCredentials('https://app.cloud.redocly.com', '2.0.0')
    ).resolves.toBeUndefined();
  });
});
