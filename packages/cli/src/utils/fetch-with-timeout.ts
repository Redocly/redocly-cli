import { getProxyAgent } from '@redocly/openapi-core';

export const DEFAULT_FETCH_TIMEOUT = 3000;

export type FetchWithTimeoutOptions = RequestInit & {
  timeout?: number;
};

export default async (url: string, { timeout, ...options }: FetchWithTimeoutOptions = {}) => {
  const requestOptions = {
    ...options,
  } as RequestInit;

  // Only set agent if proxy is configured
  const proxyAgent = getProxyAgent();
  if (proxyAgent) {
    // @ts-expect-error Node.js fetch has different type for agent
    requestOptions.dispatcher = proxyAgent;
  }

  if (!timeout) {
    return fetch(url, requestOptions);
  }

  const controller = new globalThis.AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  const res = await fetch(url, {
    ...requestOptions,
    signal: controller.signal,
  });

  clearTimeout(timeoutId);
  return res;
};
