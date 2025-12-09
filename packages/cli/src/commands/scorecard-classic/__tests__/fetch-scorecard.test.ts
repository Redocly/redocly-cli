import { fetchRemoteScorecardAndPlugins } from '../remote/fetch-scorecard.js';
import * as errorUtils from '../../../utils/error.js';

describe('fetchRemoteScorecardAndPlugins', () => {
  const mockFetch = vi.fn();
  const validProjectUrl = 'https://app.valid-url.com/org/test-org/project/test-project';
  const testToken = 'test-token';

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockClear();
    vi.spyOn(errorUtils, 'exitWithError').mockImplementation(() => {
      throw new Error('exitWithError called');
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle invalid URL format', async () => {
    await expect(fetchRemoteScorecardAndPlugins('not-a-valid-url', testToken)).rejects.toThrow();
  });

  it('should throw error when project URL pattern does not match', async () => {
    await expect(
      fetchRemoteScorecardAndPlugins('https://example.com/invalid/path', testToken)
    ).rejects.toThrow();

    expect(errorUtils.exitWithError).toHaveBeenCalledWith(
      expect.stringContaining('Invalid project URL format')
    );
  });

  it('should throw error when project is not found (404)', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 404,
    });

    await expect(fetchRemoteScorecardAndPlugins(validProjectUrl, testToken)).rejects.toThrow();

    expect(errorUtils.exitWithError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch project')
    );
  });

  it('should throw error when unauthorized (401)', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 401,
    });

    await expect(fetchRemoteScorecardAndPlugins(validProjectUrl, testToken)).rejects.toThrow();

    expect(errorUtils.exitWithError).toHaveBeenCalledWith(
      expect.stringContaining('Unauthorized access to project')
    );
  });

  it('should throw error when forbidden (403)', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 403,
    });

    await expect(fetchRemoteScorecardAndPlugins(validProjectUrl, testToken)).rejects.toThrow();

    expect(errorUtils.exitWithError).toHaveBeenCalledWith(
      expect.stringContaining('Unauthorized access to project')
    );
  });

  it('should throw error when project has no scorecard config', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: async () => ({
        id: 'project-123',
        slug: 'test-project',
        config: {},
      }),
    });

    await expect(fetchRemoteScorecardAndPlugins(validProjectUrl, testToken)).rejects.toThrow();

    expect(errorUtils.exitWithError).toHaveBeenCalledWith(
      expect.stringContaining('No scorecard configuration found')
    );
  });

  it('should return scorecard config without plugins when pluginsUrl is not set', async () => {
    const mockScorecard = {
      levels: [{ name: 'Gold', rules: {} }],
    };

    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: async () => ({
        id: 'project-123',
        slug: 'test-project',
        config: {
          scorecard: mockScorecard,
        },
      }),
    });

    const result = await fetchRemoteScorecardAndPlugins(validProjectUrl, testToken);

    expect(result).toEqual({
      scorecard: mockScorecard,
      plugins: undefined,
    });
    expect(errorUtils.exitWithError).not.toHaveBeenCalled();
  });

  it('should return scorecard config with plugins when pluginsUrl is set', async () => {
    const mockScorecard = {
      levels: [{ name: 'Gold', rules: {} }],
    };
    const mockPluginsCode = 'export default [() => ({ id: "test-plugin" })]';

    mockFetch
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          id: 'project-123',
          slug: 'test-project',
          config: {
            scorecard: mockScorecard,
            pluginsUrl: 'https://example.com/plugins.js',
          },
        }),
      })
      .mockResolvedValueOnce({
        status: 200,
        text: async () => mockPluginsCode,
      });

    const result = await fetchRemoteScorecardAndPlugins(validProjectUrl, testToken);

    expect(result).toEqual({
      scorecard: mockScorecard,
      plugins: mockPluginsCode,
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should return scorecard without plugins when plugin fetch fails', async () => {
    const mockScorecard = {
      levels: [{ name: 'Gold', rules: {} }],
    };

    mockFetch
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          id: 'project-123',
          slug: 'test-project',
          config: {
            scorecard: mockScorecard,
            pluginsUrl: 'https://example.com/plugins.js',
          },
        }),
      })
      .mockResolvedValueOnce({
        status: 404,
      });

    const result = await fetchRemoteScorecardAndPlugins(validProjectUrl, testToken);

    expect(result).toEqual({
      scorecard: mockScorecard,
      plugins: undefined,
    });
  });

  it('should use correct auth headers with access token', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: async () => ({
        id: 'project-123',
        config: { scorecard: { levels: [] } },
      }),
    });

    await fetchRemoteScorecardAndPlugins(validProjectUrl, testToken);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        headers: { Cookie: `accessToken=${testToken}` },
      })
    );
  });

  it('should use correct auth headers with API key', async () => {
    const originalApiKey = process.env.REDOCLY_AUTHORIZATION;
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: async () => ({
        id: 'project-123',
        config: { scorecard: { levels: [] } },
      }),
    });

    await fetchRemoteScorecardAndPlugins(validProjectUrl, testToken);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-api-key' },
      })
    );

    // Restore original value
    if (originalApiKey) {
      process.env.REDOCLY_AUTHORIZATION = originalApiKey;
    } else {
      delete process.env.REDOCLY_AUTHORIZATION;
    }
  });

  it('should parse project URL with different residency', async () => {
    const customUrl = 'https://custom.redocly.com/org/my-org/project/my-project';

    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: async () => ({
        id: 'project-123',
        config: { scorecard: { levels: [] } },
      }),
    });

    await fetchRemoteScorecardAndPlugins(customUrl, testToken);

    const callUrl = mockFetch.mock.calls[0][0].toString();
    expect(callUrl).toBe('https://custom.redocly.com/api/orgs/my-org/projects/my-project');
  });
});
