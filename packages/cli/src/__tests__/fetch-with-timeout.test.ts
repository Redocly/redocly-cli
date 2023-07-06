import fetchWithTimeout from '../fetch-with-timeout';
import nodeFetch from 'node-fetch';

jest.mock('node-fetch');

describe('fetchWithTimeout', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should use bare node-fetch if AbortController is not available', async () => {
    // @ts-ignore
    global.AbortController = undefined;
    // @ts-ignore
    global.setTimeout = jest.fn();
    await fetchWithTimeout('url', { method: 'GET' });

    expect(nodeFetch).toHaveBeenCalledWith('url', { method: 'GET' });

    expect(global.setTimeout).toHaveBeenCalledTimes(0);
  });

  it('should call node-fetch with signal if AbortController is  available', async () => {
    global.AbortController = jest.fn().mockImplementation(() => ({ signal: 'something' }));
    // @ts-ignore
    global.setTimeout = jest.fn();

    global.clearTimeout = jest.fn();
    await fetchWithTimeout('url');

    expect(global.setTimeout).toHaveBeenCalledTimes(1);
    expect(nodeFetch).toHaveBeenCalledWith('url', { signal: 'something' });
    expect(global.clearTimeout).toHaveBeenCalledTimes(1);
  });
});
