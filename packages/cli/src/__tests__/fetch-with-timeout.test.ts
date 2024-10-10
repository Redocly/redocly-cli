import fetchWithTimeout from '../utils/fetch-with-timeout';
import { fetch } from 'undici';
import { getProxyAgent } from '@redocly/openapi-core';
import { HttpsProxyAgent } from 'https-proxy-agent';

jest.mock('undici');
jest.mock('@redocly/openapi-core');

describe('fetchWithTimeout', () => {
  beforeAll(() => {
    // @ts-ignore
    global.setTimeout = jest.fn();
    global.clearTimeout = jest.fn();
  });

  beforeEach(() => {
    (getProxyAgent as jest.Mock).mockReturnValueOnce(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call fetch with signal', async () => {
    await fetchWithTimeout('url', { timeout: 1000 });

    expect(global.setTimeout).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('url', {
      signal: new AbortController().signal,
      agent: undefined,
    });
    expect(global.clearTimeout).toHaveBeenCalledTimes(1);
  });

  it('should call fetch with proxy agent', async () => {
    (getProxyAgent as jest.Mock).mockRestore();
    const proxyAgent = new HttpsProxyAgent('http://localhost');
    (getProxyAgent as jest.Mock).mockReturnValueOnce(proxyAgent);

    await fetchWithTimeout('url');

    expect(fetch).toHaveBeenCalledWith('url', { dispatcher: proxyAgent });
  });

  it('should call fetch without signal when timeout is not passed', async () => {
    await fetchWithTimeout('url');

    expect(global.setTimeout).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith('url', { agent: undefined });
    expect(global.clearTimeout).not.toHaveBeenCalled();
  });
});
