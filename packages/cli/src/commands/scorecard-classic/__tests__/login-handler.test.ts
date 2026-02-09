import { logger } from '@redocly/openapi-core';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RedoclyOAuthClient } from '../../../auth/oauth-client.js';
import * as errorUtils from '../../../utils/error.js';
import { handleLoginAndFetchToken } from '../auth/login-handler.js';

vi.mock('../../../auth/oauth-client.js');
vi.mock('../../../reunite/api/index.js', () => ({
  getReuniteUrl: vi.fn(() => 'https://www.test.com'),
}));

describe('handleLoginAndFetchToken', () => {
  const mockConfig = {
    resolvedConfig: {
      residency: 'us',
    },
  } as any;

  let mockOAuthClient: any;

  beforeEach(() => {
    mockOAuthClient = {
      getAccessToken: vi.fn(),
      login: vi.fn(),
    };
    vi.mocked(RedoclyOAuthClient).mockImplementation(() => mockOAuthClient);
    vi.spyOn(logger, 'info').mockImplementation(() => {});
    vi.spyOn(logger, 'warn').mockImplementation(() => {});
    vi.spyOn(logger, 'error').mockImplementation(() => {});
    vi.spyOn(errorUtils, 'exitWithError').mockImplementation(() => {
      throw new Error('exitWithError called');
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return existing access token when available', async () => {
    const testToken = 'existing-token';
    mockOAuthClient.getAccessToken.mockResolvedValue(testToken);

    const result = await handleLoginAndFetchToken(mockConfig, false);

    expect(result).toBe(testToken);
    expect(mockOAuthClient.getAccessToken).toHaveBeenCalledTimes(1);
    expect(mockOAuthClient.login).not.toHaveBeenCalled();
  });

  it('should log info when verbose is enabled and token exists', async () => {
    const testToken = 'existing-token';
    mockOAuthClient.getAccessToken.mockResolvedValue(testToken);

    await handleLoginAndFetchToken(mockConfig, true);

    expect(logger.info).toHaveBeenCalledWith('Using existing access token.\n');
  });

  it('should attempt login when no access token is found', async () => {
    const newToken = 'new-token';
    mockOAuthClient.getAccessToken.mockResolvedValueOnce(null).mockResolvedValueOnce(newToken);
    mockOAuthClient.login.mockResolvedValue(undefined);

    const result = await handleLoginAndFetchToken(mockConfig, false);

    expect(result).toBe(newToken);
    expect(mockOAuthClient.login).toHaveBeenCalled();
    expect(mockOAuthClient.getAccessToken).toHaveBeenCalledTimes(2);
  });

  it('should log warning when verbose is enabled and no token found', async () => {
    const newToken = 'new-token';
    mockOAuthClient.getAccessToken.mockResolvedValueOnce(null).mockResolvedValueOnce(newToken);
    mockOAuthClient.login.mockResolvedValue(undefined);

    await handleLoginAndFetchToken(mockConfig, true);

    expect(logger.warn).toHaveBeenCalledWith(
      'No valid access token found or refresh token expired. Attempting login...\n'
    );
  });

  it('should handle login failure and exit with error', async () => {
    const loginError = new Error('Login failed');
    mockOAuthClient.getAccessToken.mockResolvedValue(null);
    mockOAuthClient.login.mockRejectedValue(loginError);

    await expect(handleLoginAndFetchToken(mockConfig, false)).rejects.toThrow(
      'exitWithError called'
    );

    expect(errorUtils.exitWithError).toHaveBeenCalledWith(
      expect.stringContaining('Login failed. Please try again or check your connection')
    );
  });

  it('should log error details when verbose is enabled and login fails', async () => {
    const loginError = new Error('Network error');
    mockOAuthClient.getAccessToken.mockResolvedValue(null);
    mockOAuthClient.login.mockRejectedValue(loginError);

    await expect(handleLoginAndFetchToken(mockConfig, true)).rejects.toThrow();

    expect(logger.error).toHaveBeenCalledWith('❌ Login failed.\n');
    expect(logger.error).toHaveBeenCalledWith('Error details: Network error\n');
  });
});
