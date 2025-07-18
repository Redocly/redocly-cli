import AbortController from 'abort-controller';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Agent } from 'undici';
import fetchWithTimeout from '../utils/fetch-with-timeout.js';
import * as proxyAgent from '../utils/proxy-agent.js';

const signalInstance = new AbortController().signal;

const mockFetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    headers: new Headers(),
    statusText: 'OK',
    redirected: false,
    type: 'default',
    url: '',
    clone: () => ({} as Response),
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    text: async () => '',
    signal: signalInstance,
    bytes: async () => new Uint8Array(),
    dispatcher: undefined,
  } as Response)
);

const originalFetch = global.fetch;
global.fetch = mockFetch;

vi.mock('../utils/get-proxy-agent.js', async () => {
  const actual = await vi.importActual('../utils/get-proxy-agent.js');
  return { ...actual };
});

describe('fetchWithTimeout', () => {
  beforeAll(() => {
    global.setTimeout = vi.fn() as any;
    global.clearTimeout = vi.fn();
  });

  beforeEach(() => {
    vi.mock('@redocly/openapi-core');
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('should call fetch with signal and agent when timeout is provided', async () => {
    await fetchWithTimeout('url', { timeout: 1000 });

    expect(global.fetch).toHaveBeenCalledWith(
      'url',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        dispatcher: expect.any(Agent),
      })
    );
  });

  it('should call fetch with proxy agent', async () => {
    const dispatcher = new HttpsProxyAgent('http://localhost');
    vi.spyOn(proxyAgent, 'getProxyAgent').mockReturnValueOnce(dispatcher);

    await fetchWithTimeout('url');

    expect(global.fetch).toHaveBeenCalledWith('url', { dispatcher });
  });

  it('should call fetch without signal and without dispatcher when timeout is not passed', async () => {
    await fetchWithTimeout('url');

    expect(global.fetch).toHaveBeenCalledWith('url', {});
  });
});
