import { fetchRemoteScorecardAndPlugins } from '../remote/fetch-scorecard.js';
import * as openapiCore from '@redocly/openapi-core';

describe('fetchRemoteScorecardAndPlugins', () => {
  const mockFetch = vi.fn();
  const validProjectUrl = 'https://app.redocly.com/org/test-org/project/test-project';
  const testToken = 'test-token';

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockClear();
    vi.spyOn(openapiCore.logger, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle invalid URL format', async () => {
    await expect(fetchRemoteScorecardAndPlugins('not-a-valid-url', testToken)).rejects.toThrow();
  });

  it('should return undefined when project URL pattern does not match', async () => {
    const result = await fetchRemoteScorecardAndPlugins(
      'https://example.com/invalid/path',
      testToken
    );

    expect(result).toBeUndefined();
    expect(openapiCore.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Invalid project URL format')
    );
  });

  it('should return undefined when organization is not found', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ items: [] }),
    });

    const result = await fetchRemoteScorecardAndPlugins(validProjectUrl, testToken);

    expect(result).toBeUndefined();
    expect(openapiCore.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Organization not found')
    );
  });

  it('should return undefined when organization fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 404,
    });

    const result = await fetchRemoteScorecardAndPlugins(validProjectUrl, testToken);

    expect(result).toBeUndefined();
    expect(openapiCore.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Organization not found')
    );
  });

  it('should return undefined when project is not found', async () => {
    mockFetch
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ items: [{ id: 'org-123', slug: 'test-org' }] }),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ items: [] }),
      });

    const result = await fetchRemoteScorecardAndPlugins(validProjectUrl, testToken);

    expect(result).toBeUndefined();
    expect(openapiCore.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Project not found')
    );
  });

  it('should return undefined when project has no scorecard config', async () => {
    mockFetch
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ items: [{ id: 'org-123', slug: 'test-org' }] }),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          items: [
            {
              id: 'project-123',
              slug: 'test-project',
              config: {},
            },
          ],
        }),
      });

    const result = await fetchRemoteScorecardAndPlugins(validProjectUrl, testToken);

    expect(result).toBeUndefined();
    expect(openapiCore.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('No scorecard configuration found')
    );
  });

  it('should return scorecard config without plugins when pluginsUrl is not set', async () => {
    const mockScorecard = {
      levels: [{ name: 'Gold', rules: {} }],
    };

    mockFetch
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ items: [{ id: 'org-123', slug: 'test-org' }] }),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          items: [
            {
              id: 'project-123',
              slug: 'test-project',
              config: {
                scorecard: mockScorecard,
              },
            },
          ],
        }),
      });

    const result = await fetchRemoteScorecardAndPlugins(validProjectUrl, testToken);

    expect(result).toEqual({
      scorecard: mockScorecard,
      plugins: undefined,
    });
    expect(openapiCore.logger.warn).not.toHaveBeenCalled();
  });

  it('should return scorecard config with plugins when pluginsUrl is set', async () => {
    const mockScorecard = {
      levels: [{ name: 'Gold', rules: {} }],
    };
    const mockPluginsCode = 'export default [() => ({ id: "test-plugin" })]';

    mockFetch
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ items: [{ id: 'org-123', slug: 'test-org' }] }),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          items: [
            {
              id: 'project-123',
              slug: 'test-project',
              config: {
                scorecard: mockScorecard,
                pluginsUrl: 'https://example.com/plugins.js',
              },
            },
          ],
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
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('should return scorecard without plugins when plugin fetch fails', async () => {
    const mockScorecard = {
      levels: [{ name: 'Gold', rules: {} }],
    };

    mockFetch
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ items: [{ id: 'org-123', slug: 'test-org' }] }),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          items: [
            {
              id: 'project-123',
              slug: 'test-project',
              config: {
                scorecard: mockScorecard,
                pluginsUrl: 'https://example.com/plugins.js',
              },
            },
          ],
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

  it('should use correct auth headers when fetching organization', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ items: [] }),
    });

    await fetchRemoteScorecardAndPlugins(validProjectUrl, testToken);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        headers: { Cookie: `accessToken=${testToken}` },
      })
    );
  });

  it('should parse project URL with different residency', async () => {
    const customUrl = 'https://custom.redocly.com/org/my-org/project/my-project';

    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ items: [] }),
    });

    await fetchRemoteScorecardAndPlugins(customUrl, testToken);

    const callUrl = mockFetch.mock.calls[0][0].toString();
    expect(callUrl).toContain('https://custom.redocly.com/api/orgs');
    expect(callUrl).toContain('filter=slug%3Amy-org');
  });
});
