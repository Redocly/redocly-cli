import nodeFetch, { type RequestInit } from 'node-fetch';
import AbortController from 'abort-controller';
import { getProxyAgent } from '@redocly/openapi-core';

export const DEFAULT_FETCH_TIMEOUT = 3000;

export type FetchWithTimeoutOptions = RequestInit & {
  timeout?: number;
};

export default async (url: string, { timeout, ...options }: FetchWithTimeoutOptions = {}) => {
  if (!timeout) {
    return nodeFetch(url, {
      ...options,
      agent: getProxyAgent(),
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  const res = await nodeFetch(url, {
    signal: controller.signal,
    ...options,
    agent: getProxyAgent(),
  });

  clearTimeout(timeoutId);

  return res;
};
