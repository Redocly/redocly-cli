import AbortController from 'abort-controller';
import fetchWithTimeout from '../utils/fetch-with-timeout';
import { getProxyAgent } from '@redocly/openapi-core';
import { HttpsProxyAgent } from 'https-proxy-agent';

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

  it('should call fetch with signal', async () => {
    await fetchWithTimeout('url', { timeout: 1000 });

    expect(global.setTimeout).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'url',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        dispatcher: undefined,
      })
    );
    expect(global.clearTimeout).toHaveBeenCalledTimes(1);
  });

  it('should call fetch with proxy agent', async () => {
    const proxyAgent = new HttpsProxyAgent('http://localhost');
    vi.mocked(getProxyAgent).mockReturnValueOnce(proxyAgent as any);

    await fetchWithTimeout('url');

    expect(global.fetch).toHaveBeenCalledWith('url', { dispatcher: proxyAgent });
  });

  it('should call fetch without signal when timeout is not passed', async () => {
    await fetchWithTimeout('url');

    expect(global.setTimeout).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith('url', { agent: undefined });
    expect(global.clearTimeout).not.toHaveBeenCalled();
  });
});
