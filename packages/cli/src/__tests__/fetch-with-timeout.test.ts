import AbortController from 'abort-controller';
import fetchWithTimeout from '../utils/fetch-with-timeout.js';
import nodeFetch from 'node-fetch';

jest.mock('node-fetch');

describe('fetchWithTimeout', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call node-fetch with signal', async () => {
    // @ts-ignore
    global.setTimeout = jest.fn();

    global.clearTimeout = jest.fn();
    await fetchWithTimeout('url');

    expect(global.setTimeout).toHaveBeenCalledTimes(1);
    // @ts-ignore FIXME:
    expect(nodeFetch).toHaveBeenCalledWith('url', { signal: new AbortController().signal });
    expect(global.clearTimeout).toHaveBeenCalledTimes(1);
  });
});
