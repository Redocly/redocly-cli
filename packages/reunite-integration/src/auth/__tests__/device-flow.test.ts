import * as childProcess from 'node:child_process';

import { RedoclyOAuthDeviceFlow } from '../device-flow.js';

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof childProcess>();
  return { ...actual, spawn: vi.fn() };
});

describe('RedoclyOAuthDeviceFlow', () => {
  const mockBaseUrl = 'https://test.redocly.com';
  let flow: RedoclyOAuthDeviceFlow;

  beforeEach(() => {
    flow = new RedoclyOAuthDeviceFlow(mockBaseUrl, '1.2.3');
  });

  describe('verifyToken', () => {
    it('returns true for valid token', async () => {
      vi.spyOn(flow['apiClient'], 'request').mockResolvedValue({
        json: () => Promise.resolve({ user: { id: '123' } }),
      } as Response);

      const result = await flow.verifyToken('valid-token');
      expect(result).toBe(true);
    });

    it('returns false for invalid token', async () => {
      vi.spyOn(flow['apiClient'], 'request').mockRejectedValue(new Error('Invalid token'));
      const result = await flow.verifyToken('invalid-token');
      expect(result).toBe(false);
    });
  });

  describe('verifyApiKey', () => {
    it('returns true for valid API key', async () => {
      vi.spyOn(flow['apiClient'], 'request').mockResolvedValue({
        json: () => Promise.resolve({ success: true }),
      } as Response);

      const result = await flow.verifyApiKey('valid-key');
      expect(result).toBe(true);
    });

    it('returns false for invalid API key', async () => {
      vi.spyOn(flow['apiClient'], 'request').mockRejectedValue(new Error('Invalid API key'));
      const result = await flow.verifyApiKey('invalid-key');
      expect(result).toBe(false);
    });
  });

  describe('refreshToken', () => {
    it('successfully refreshes token', async () => {
      const mockResponse = {
        access_token: 'new-token',
        refresh_token: 'new-refresh',
        expires_in: 3600,
      };
      vi.spyOn(flow['apiClient'], 'request').mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await flow.refreshToken('old-refresh-token');
      expect(result).toEqual({
        ...mockResponse,
        residency: mockBaseUrl,
      });
    });

    it('throws error when refresh fails', async () => {
      vi.spyOn(flow['apiClient'], 'request').mockResolvedValue({
        json: () => Promise.resolve({}),
      } as Response);

      await expect(flow.refreshToken('invalid-refresh')).rejects.toThrow('Failed to refresh token');
    });
  });

  describe('run', () => {
    it('hands the device code to the callback before polling for the token', async () => {
      vi.mocked(childProcess.spawn).mockReturnValue({
        on: vi.fn().mockReturnThis(),
        unref: vi.fn(),
      } as unknown as childProcess.ChildProcess);
      const request = vi.spyOn(flow['apiClient'], 'request');
      request
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              device_code: 'device-1',
              user_code: 'ABCD-EFGH',
              verification_uri: 'https://test.redocly.com/device',
              verification_uri_complete: 'https://test.redocly.com/device?code=ABCD-EFGH',
              interval: 0.01,
              expires_in: 5,
            }),
        } as Response)
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({ access_token: 'token', refresh_token: 'refresh', expires_in: 3600 }),
        } as Response);
      const onDeviceCode = vi.fn();

      const credentials = await flow.run(onDeviceCode);

      expect(onDeviceCode).toHaveBeenCalledWith({
        verificationUri: 'https://test.redocly.com/device',
        verificationUriComplete: 'https://test.redocly.com/device?code=ABCD-EFGH',
        userCode: 'ABCD-EFGH',
      });
      expect(onDeviceCode.mock.invocationCallOrder[0]).toBeLessThan(
        request.mock.invocationCallOrder[1]
      );
      expect(credentials).toEqual({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_in: 3600,
        residency: mockBaseUrl,
      });
    });
  });

  describe('openBrowser', () => {
    const url = 'https://test.redocly.com/device?user_code=ABCD';

    it('detaches the browser launcher so the CLI does not wait for it to exit', () => {
      const launcher = { on: vi.fn().mockReturnThis(), unref: vi.fn() };
      vi.mocked(childProcess.spawn).mockReturnValue(
        launcher as unknown as childProcess.ChildProcess
      );

      flow['openBrowser'](url);

      expect(childProcess.spawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([url]),
        { stdio: 'ignore', detached: true }
      );
      expect(launcher.unref).toHaveBeenCalled();
    });

    it('does not launch anything for a URL that is not http(s)', () => {
      flow['openBrowser']('file:///tmp/page.html');

      expect(childProcess.spawn).not.toHaveBeenCalled();
    });
  });
});
