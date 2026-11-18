import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { PlatformApiError } from '../../api/api-client.js';
import type { CredentialsStore } from '../credentials-store.js';
import { RedoclyOAuthDeviceFlow } from '../device-flow.js';
import { RedoclyOAuthClient } from '../oauth-client.js';

vi.mock('node:fs');
vi.mock('../device-flow.js');
vi.mock('node:os');

describe('RedoclyOAuthClient', () => {
  const mockBaseUrl = 'https://test.redocly.com';
  const mockHomeDir = '/mock/home/dir';
  const mockRedoclyDir = path.join(mockHomeDir, '.redocly');
  let client: RedoclyOAuthClient;

  beforeEach(() => {
    vi.mocked(os.homedir).mockReturnValue(mockHomeDir);
    process.env.HOME = mockHomeDir;
    client = new RedoclyOAuthClient('1.2.3');
  });

  describe('login', () => {
    it('successfully logs in and saves token', async () => {
      const mockToken = { access_token: 'test-token' };
      const mockDeviceFlow = {
        run: vi.fn().mockResolvedValue(mockToken),
      };
      vi.mocked(RedoclyOAuthDeviceFlow).mockImplementation(function () {
        return mockDeviceFlow;
      });

      await client.login(mockBaseUrl);

      expect(mockDeviceFlow.run).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('throws error when login fails', async () => {
      const mockDeviceFlow = {
        run: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(RedoclyOAuthDeviceFlow).mockImplementation(function () {
        return mockDeviceFlow;
      });

      await expect(client.login(mockBaseUrl)).rejects.toThrow('Failed to login');
    });

    it('hands the device code callback and the browser hook to the flow', async () => {
      const mockDeviceFlow = { run: vi.fn().mockResolvedValue({ access_token: 'test-token' }) };
      vi.mocked(RedoclyOAuthDeviceFlow).mockImplementation(function () {
        return mockDeviceFlow;
      });
      const onDeviceCode = vi.fn();
      const openBrowser = vi.fn();

      await client.login(mockBaseUrl, onDeviceCode, openBrowser);

      expect(mockDeviceFlow.run).toHaveBeenCalledWith(onDeviceCode, openBrowser);
    });

    it('fails when the credentials cannot be saved', async () => {
      const mockDeviceFlow = { run: vi.fn().mockResolvedValue({ access_token: 'test-token' }) };
      vi.mocked(RedoclyOAuthDeviceFlow).mockImplementation(function () {
        return mockDeviceFlow;
      });
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      await expect(client.login(mockBaseUrl)).rejects.toThrow(
        'Failed to save credentials: EACCES: permission denied'
      );
    });
  });

  describe('logout', () => {
    it('removes the credentials file', async () => {
      await client.logout();

      expect(fs.rmSync).toHaveBeenCalledWith(path.join(mockRedoclyDir, 'credentials'), {
        force: true,
      });
    });

    it('silently fails if the credentials file cannot be removed', async () => {
      vi.mocked(fs.rmSync).mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      await expect(client.logout()).resolves.not.toThrow();
    });
  });

  describe('isAuthorized', () => {
    it('verifies API key if provided', async () => {
      const mockDeviceFlow = {
        verifyApiKey: vi.fn().mockResolvedValue(true),
      };
      vi.mocked(RedoclyOAuthDeviceFlow).mockImplementation(function () {
        return mockDeviceFlow;
      });

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

  describe('getAuthState', () => {
    const credentials = {
      access_token: 'stored-token',
      refresh_token: 'stored-refresh',
      expires_in: 3600,
      residency: mockBaseUrl,
    };
    let stored: string | null;
    let store: CredentialsStore;
    let storeClient: RedoclyOAuthClient;

    const mockDeviceFlow = (methods: Record<string, unknown>) =>
      vi.mocked(RedoclyOAuthDeviceFlow).mockImplementation(function () {
        return methods;
      });

    beforeEach(async () => {
      stored = null;
      store = {
        read: vi.fn(async () => stored),
        write: vi.fn(async (value: string) => {
          stored = value;
        }),
        delete: vi.fn(async () => {
          stored = null;
        }),
      };
      storeClient = new RedoclyOAuthClient('1.2.3', store);
      mockDeviceFlow({ run: vi.fn().mockResolvedValue(credentials) });
      await storeClient.login(mockBaseUrl);
    });

    it('reads and writes the credentials through the given store', async () => {
      expect(store.write).toHaveBeenCalledOnce();
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('returns signed-out when the store has no credentials', async () => {
      stored = null;

      await expect(storeClient.getAuthState(mockBaseUrl)).resolves.toEqual({
        status: 'signed-out',
      });
    });

    it('returns invalid-reunite-url for a platform URL that is not https', async () => {
      await expect(storeClient.getAuthState('http://test.redocly.com')).resolves.toEqual({
        status: 'invalid-reunite-url',
      });
    });

    it('returns residency-mismatch with the stored and the expected URL', async () => {
      await expect(storeClient.getAuthState('https://other.redocly.com')).resolves.toEqual({
        status: 'residency-mismatch',
        stored: mockBaseUrl,
        expected: 'https://other.redocly.com',
      });
    });

    it('returns the token when the platform accepts it', async () => {
      mockDeviceFlow({ verifyToken: vi.fn().mockResolvedValue('valid') });

      await expect(storeClient.getAuthState(mockBaseUrl)).resolves.toEqual({
        status: 'authorized',
        token: 'stored-token',
      });
    });

    it('returns offline without refreshing or removing the credentials when the platform is unreachable', async () => {
      const refreshToken = vi.fn();
      mockDeviceFlow({ verifyToken: vi.fn().mockResolvedValue('unreachable'), refreshToken });

      await expect(storeClient.getAuthState(mockBaseUrl)).resolves.toEqual({ status: 'offline' });
      expect(refreshToken).not.toHaveBeenCalled();
      expect(store.delete).not.toHaveBeenCalled();
    });

    it('refreshes an expired token and saves the new credentials', async () => {
      mockDeviceFlow({
        verifyToken: vi.fn().mockResolvedValue('expired'),
        refreshToken: vi.fn().mockResolvedValue({ ...credentials, access_token: 'new-token' }),
      });

      await expect(storeClient.getAuthState(mockBaseUrl)).resolves.toEqual({
        status: 'authorized',
        token: 'new-token',
      });
      expect(store.write).toHaveBeenCalledTimes(2);
    });

    it('removes the credentials when the platform rejects the refresh token with 400', async () => {
      mockDeviceFlow({
        verifyToken: vi.fn().mockResolvedValue('expired'),
        refreshToken: vi.fn().mockRejectedValue(new PlatformApiError('Failed', 400)),
      });

      await expect(storeClient.getAuthState(mockBaseUrl)).resolves.toEqual({
        status: 'session-expired',
      });
      expect(store.delete).toHaveBeenCalled();
    });

    it('keeps the credentials when the refresh fails with 5xx', async () => {
      mockDeviceFlow({
        verifyToken: vi.fn().mockResolvedValue('expired'),
        refreshToken: vi.fn().mockRejectedValue(new PlatformApiError('Failed', 502)),
      });

      await expect(storeClient.getAuthState(mockBaseUrl)).resolves.toEqual({ status: 'offline' });
      expect(store.delete).not.toHaveBeenCalled();
    });

    it('shares one check between concurrent calls', async () => {
      const verifyToken = vi.fn().mockResolvedValue('valid');
      mockDeviceFlow({ verifyToken });

      await Promise.all([
        storeClient.getAuthState(mockBaseUrl),
        storeClient.getAuthState(mockBaseUrl),
      ]);

      expect(verifyToken).toHaveBeenCalledOnce();
    });
  });
});
