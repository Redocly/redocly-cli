import { RedoclyOAuthClient } from '../oauth-client';
import { RedoclyOAuthDeviceFlow } from '../device-flow';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import type { Mock } from 'vitest';

vi.mock('node:fs');
vi.mock('node:os');
vi.mock('../device-flow');

describe('RedoclyOAuthClient', () => {
  const mockClientName = 'test-client';
  const mockVersion = '1.0.0';
  const mockBaseUrl = 'https://test.redocly.com';
  const mockHomeDir = '/mock/home/dir';
  const mockRedoclyDir = path.join(mockHomeDir, '.redocly');
  let client: RedoclyOAuthClient;

  beforeEach(() => {
    vi.resetAllMocks();
    (os.homedir as Mock).mockReturnValue(mockHomeDir);
    process.env.HOME = mockHomeDir;
    client = new RedoclyOAuthClient(mockClientName, mockVersion);
  });

  describe('login', () => {
    it('successfully logs in and saves token', async () => {
      const mockToken = { access_token: 'test-token' };
      const mockDeviceFlow = {
        run: vi.fn().mockResolvedValue(mockToken),
      };
      (RedoclyOAuthDeviceFlow as Mock).mockImplementation(() => mockDeviceFlow);

      await client.login(mockBaseUrl);

      expect(mockDeviceFlow.run).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('throws error when login fails', async () => {
      const mockDeviceFlow = {
        run: vi.fn().mockResolvedValue(null),
      };
      (RedoclyOAuthDeviceFlow as Mock).mockImplementation(() => mockDeviceFlow);

      await expect(client.login(mockBaseUrl)).rejects.toThrow('Failed to login');
    });
  });

  describe('logout', () => {
    it('removes token file if it exists', async () => {
      (fs.existsSync as Mock).mockReturnValue(true);

      await client.logout();

      expect(fs.rmSync).toHaveBeenCalledWith(path.join(mockRedoclyDir, 'auth.json'));
    });

    it('silently fails if token file does not exist', async () => {
      (fs.existsSync as Mock).mockReturnValue(false);

      await expect(client.logout()).resolves.not.toThrow();
      expect(fs.rmSync).not.toHaveBeenCalled();
    });
  });

  describe('isAuthorized', () => {
    it('verifies API key if provided', async () => {
      const mockDeviceFlow = {
        verifyApiKey: vi.fn().mockResolvedValue(true),
      };
      (RedoclyOAuthDeviceFlow as Mock).mockImplementation(() => mockDeviceFlow);

      const result = await client.isAuthorized(mockBaseUrl, 'test-api-key');

      expect(result).toBe(true);
      expect(mockDeviceFlow.verifyApiKey).toHaveBeenCalledWith('test-api-key');
    });

    it('verifies access token if no API key provided', async () => {
      const mockToken = { access_token: 'test-token' };
      const mockDeviceFlow = {
        verifyToken: vi.fn().mockResolvedValue(true),
      };
      (RedoclyOAuthDeviceFlow as Mock).mockImplementation(() => mockDeviceFlow);
      (fs.readFileSync as Mock).mockReturnValue(
        client['cipher'].update(JSON.stringify(mockToken), 'utf8', 'hex') +
          client['cipher'].final('hex')
      );

      const result = await client.isAuthorized(mockBaseUrl);

      expect(result).toBe(true);
      expect(mockDeviceFlow.verifyToken).toHaveBeenCalledWith('test-token');
    });

    it('returns false if token refresh fails', async () => {
      const mockToken = {
        access_token: 'old-token',
        refresh_token: 'refresh-token',
      };
      const mockDeviceFlow = {
        verifyToken: vi.fn().mockResolvedValue(false),
        refreshToken: vi.fn().mockRejectedValue(new Error('Refresh failed')),
      };
      (RedoclyOAuthDeviceFlow as Mock).mockImplementation(() => mockDeviceFlow);
      (fs.readFileSync as Mock).mockReturnValue(
        client['cipher'].update(JSON.stringify(mockToken), 'utf8', 'hex') +
          client['cipher'].final('hex')
      );

      const result = await client.isAuthorized(mockBaseUrl);

      expect(result).toBe(false);
    });
  });
});
