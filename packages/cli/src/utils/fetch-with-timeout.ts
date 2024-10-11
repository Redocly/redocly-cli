import AbortController from 'abort-controller';
import { getProxyAgent } from '@redocly/openapi-core';
import { isBrowser } from '@redocly/openapi-core/lib/env';

export const DEFAULT_FETCH_TIMEOUT = 3000;

export type FetchWithTimeoutOptions = RequestInit & {
  timeout?: number;
};

export default async (url: string, { timeout, ...options }: FetchWithTimeoutOptions = {}) => {
  if (!timeout) {
    return fetch(url, {
      ...options,
      ...(isBrowser ? {} : { agent: getProxyAgent() }), // Conditionally add agent only in Node.js
    });
  }

  const controller = isBrowser ? new window.AbortController() : new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  const res = await fetch(url, {
    signal: controller.signal as AbortSignal,
    ...options,
    ...(isBrowser ? {} : { agent: getProxyAgent() }),
  });

  clearTimeout(timeoutId);

  return res;
};
