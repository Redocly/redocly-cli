import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { RedoclyOAuthDeviceFlow } from '../device-flow.js';
import { RedoclyOAuthClient } from '../oauth-client.js';

describe('RedoclyOAuthClient', () => {
  const mockBaseUrl = 'https://test.redocly.com';
  const mockHomeDir = '/mock/home/dir';
  const mockRedoclyDir = path.join(mockHomeDir, '.redocly');
  let client: RedoclyOAuthClient;

  beforeEach(() => {
    vi.mock('node:fs');
    vi.mock('../device-flow.js');
    vi.mock('node:os');
    vi.mocked(os.homedir).mockReturnValue(mockHomeDir);
    process.env.HOME = mockHomeDir;
    client = new RedoclyOAuthClient();
  });

  describe('login', () => {
    it('successfully logs in and saves token', async () => {
      const mockToken = { access_token: 'test-token' };
      const mockDeviceFlow = {
        run: vi.fn().mockResolvedValue(mockToken),
      };
      vi.mocked(RedoclyOAuthDeviceFlow).mockImplementation(() => mockDeviceFlow as any);

      await client.login(mockBaseUrl);

      expect(mockDeviceFlow.run).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('throws error when login fails', async () => {
      const mockDeviceFlow = {
        run: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(RedoclyOAuthDeviceFlow).mockImplementation(() => mockDeviceFlow as any);

      await expect(client.login(mockBaseUrl)).rejects.toThrow('Failed to login');
    });
  });

  describe('logout', () => {
    it('removes token file if it exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      await client.logout();

      expect(fs.rmSync).toHaveBeenCalledWith(path.join(mockRedoclyDir, 'credentials'));
    });

    it('silently fails if token file does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(client.logout()).resolves.not.toThrow();
      expect(fs.rmSync).not.toHaveBeenCalled();
    });
  });

  describe('isAuthorized', () => {
    it('verifies API key if provided', async () => {
      const mockDeviceFlow = {
        verifyApiKey: vi.fn().mockResolvedValue(true),
      };
      vi.mocked(RedoclyOAuthDeviceFlow).mockImplementation(() => mockDeviceFlow as any);

      const result = await client.isAuthorized(mockBaseUrl, 'test-api-key');

      expect(result).toBe(true);
      expect(mockDeviceFlow.verifyApiKey).toHaveBeenCalledWith('test-api-key');
    });

    it('verifies access token if no API key provided', async () => {
      // Mock getAccessToken to return a valid token
      const getAccessTokenSpy = vi.spyOn(client, 'getAccessToken').mockResolvedValue('test-token');

      const result = await client.isAuthorized(mockBaseUrl);

      expect(result).toBe(true);
      expect(getAccessTokenSpy).toHaveBeenCalledWith(mockBaseUrl);
    });

    it('returns false if token refresh fails', async () => {
      // Mock getAccessToken to return null (indicating refresh failed)
      const getAccessTokenSpy = vi.spyOn(client, 'getAccessToken').mockResolvedValue(null);

      const result = await client.isAuthorized(mockBaseUrl);

      expect(result).toBe(false);
      expect(getAccessTokenSpy).toHaveBeenCalledWith(mockBaseUrl);
    });

    it('returns false if no token exists', async () => {
      // Mock getAccessToken to return null (no token)
      const getAccessTokenSpy = vi.spyOn(client, 'getAccessToken').mockResolvedValue(null);

      const result = await client.isAuthorized(mockBaseUrl);

      expect(result).toBe(false);
      expect(getAccessTokenSpy).toHaveBeenCalledWith(mockBaseUrl);
    });
  });
});
