import { Agent, ProxyAgent, fetch } from 'undici';
import type * as undici from 'undici';

import { fetchWithTimeout } from '../fetch-with-timeout.js';
import * as proxyAgent from '../proxy-agent.js';

vi.mock('undici', async (importOriginal) => ({
  ...(await importOriginal<typeof undici>()),
  fetch: vi.fn(),
}));
vi.mock('@redocly/openapi-core');

describe('fetchWithTimeout', () => {
  beforeAll(() => {
    global.setTimeout = vi.fn() as any;
    global.clearTimeout = vi.fn();
  });

  it('should call fetch with signal and agent when timeout is provided', async () => {
    await fetchWithTimeout('url', { timeout: 1000 });

    expect(fetch).toHaveBeenCalledWith(
      'url',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        dispatcher: expect.any(Agent),
      })
    );
  });

  it('should call fetch with proxy agent', async () => {
    const proxyUrl = 'http://localhost:8080';
    vi.spyOn(proxyAgent, 'getProxyUrl').mockReturnValueOnce(proxyUrl);

    await fetchWithTimeout('url');

    expect(fetch).toHaveBeenCalledWith(
      'url',
      expect.objectContaining({
        dispatcher: expect.any(ProxyAgent),
      })
    );
  });

  it('should call fetch without signal and without dispatcher when timeout is not passed', async () => {
    await fetchWithTimeout('url');

    expect(fetch).toHaveBeenCalledWith('url', {});
  });

  it('should bypass proxy when URL matches NO_PROXY', async () => {
    vi.spyOn(proxyAgent, 'getProxyUrl').mockReturnValueOnce('http://proxy:8080');
    vi.spyOn(proxyAgent, 'shouldBypassProxy').mockReturnValueOnce(true);

    await fetchWithTimeout('http://localhost:3000/api');

    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api', {});
  });

  it('should use proxy when URL does not match NO_PROXY', async () => {
    vi.spyOn(proxyAgent, 'getProxyUrl').mockReturnValueOnce('http://proxy:8080');
    vi.spyOn(proxyAgent, 'shouldBypassProxy').mockReturnValueOnce(false);

    await fetchWithTimeout('http://external.com/api');

    expect(fetch).toHaveBeenCalledWith(
      'http://external.com/api',
      expect.objectContaining({
        dispatcher: expect.any(ProxyAgent),
      })
    );
  });
});
