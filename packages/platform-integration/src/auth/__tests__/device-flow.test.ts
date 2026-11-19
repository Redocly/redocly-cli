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

  describe('getTokenStatus', () => {
    it('returns valid for a token the platform accepts', async () => {
      vi.spyOn(flow['apiClient'], 'request').mockResolvedValue(
        Response.json({ user: { id: '123' } })
      );

      await expect(flow.getTokenStatus('valid-token')).resolves.toBe('valid');
    });

    it('returns expired when the platform answers 401', async () => {
      vi.spyOn(flow['apiClient'], 'request').mockResolvedValue(Response.json({}, { status: 401 }));

      await expect(flow.getTokenStatus('expired-token')).resolves.toBe('expired');
    });

    it('returns expired for a session without a user', async () => {
      vi.spyOn(flow['apiClient'], 'request').mockResolvedValue(Response.json({}));

      await expect(flow.getTokenStatus('token')).resolves.toBe('expired');
    });

    it('returns unreachable on a 5xx answer', async () => {
      vi.spyOn(flow['apiClient'], 'request').mockResolvedValue(Response.json({}, { status: 503 }));

      await expect(flow.getTokenStatus('token')).resolves.toBe('unreachable');
    });

    it('returns unreachable on a network error', async () => {
      vi.spyOn(flow['apiClient'], 'request').mockRejectedValue(new Error('Failed to fetch.'));

      await expect(flow.getTokenStatus('token')).resolves.toBe('unreachable');
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
      vi.spyOn(flow['apiClient'], 'request').mockResolvedValue(Response.json(mockResponse));

      const result = await flow.refreshToken('old-refresh-token');
      expect(result).toEqual({
        ...mockResponse,
        residency: mockBaseUrl,
      });
    });

    it('throws error when refresh fails', async () => {
      vi.spyOn(flow['apiClient'], 'request').mockResolvedValue(Response.json({}));

      await expect(flow.refreshToken('invalid-refresh')).rejects.toThrow('Failed to refresh token');
    });

    it('throws the HTTP status when the platform rejects the refresh token', async () => {
      vi.spyOn(flow['apiClient'], 'request').mockResolvedValue(Response.json({}, { status: 400 }));

      await expect(flow.refreshToken('invalid-refresh')).rejects.toMatchObject({ status: 400 });
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

    it('opens the verification page with the given browser hook instead of spawning one', async () => {
      vi.spyOn(flow['apiClient'], 'request')
        .mockResolvedValueOnce(
          Response.json({
            device_code: 'device-1',
            user_code: 'ABCD-EFGH',
            verification_uri: 'https://test.redocly.com/device',
            verification_uri_complete: 'https://test.redocly.com/device?code=ABCD-EFGH',
            interval: 0.01,
            expires_in: 5,
          })
        )
        .mockResolvedValueOnce(
          Response.json({ access_token: 'token', refresh_token: 'refresh', expires_in: 3600 })
        );
      const openBrowser = vi.fn().mockResolvedValue(true);

      await flow.run(undefined, openBrowser);

      expect(openBrowser).toHaveBeenCalledWith('https://test.redocly.com/device?code=ABCD-EFGH');
      expect(childProcess.spawn).not.toHaveBeenCalled();
    });

    it('stops the login without polling when the browser hook could not open the page', async () => {
      const request = vi.spyOn(flow['apiClient'], 'request').mockResolvedValueOnce(
        Response.json({
          device_code: 'device-1',
          user_code: 'ABCD-EFGH',
          verification_uri: 'https://test.redocly.com/device',
          verification_uri_complete: 'https://test.redocly.com/device?code=ABCD-EFGH',
        })
      );

      await expect(flow.run(undefined, async () => false)).rejects.toThrow(
        'Failed to open the login page.'
      );
      expect(request).toHaveBeenCalledOnce();
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
