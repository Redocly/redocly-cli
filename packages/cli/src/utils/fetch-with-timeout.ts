import {
  Agent,
  type FormData as UndiciFormData,
  ProxyAgent,
  type RequestInit as UndiciRequestInit,
  fetch,
} from 'undici';

import { getProxyUrl, shouldBypassProxy } from './proxy-agent.js';

export type FetchWithTimeoutOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | UndiciFormData;
  timeout?: number;
};

export const fetchWithTimeout = async (
  url: string,
  { timeout, ...options }: FetchWithTimeoutOptions = {}
) => {
  const proxyUrl = getProxyUrl();
  const useProxy = proxyUrl && !shouldBypassProxy(url);
  let dispatcher: Agent | ProxyAgent | undefined;

  if (useProxy) {
    dispatcher = new ProxyAgent({ uri: proxyUrl });
  } else if (timeout) {
    dispatcher = new Agent({ connect: { timeout } });
  }

  try {
    const res = await fetch(url, {
      signal: timeout ? AbortSignal.timeout(timeout) : undefined,
      ...options,
      dispatcher,
    } as UndiciRequestInit);

    return res as unknown as Response;
  } catch (error) {
    // A request that times out while a proxy is still opening the tunnel leaves that socket
    // open, and the open socket keeps the process alive.
    await dispatcher?.destroy();
    throw error;
  }
};
