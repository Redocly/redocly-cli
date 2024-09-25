import fetch from 'node-fetch';
import AbortController from 'abort-controller';
import { getProxyAgent } from '@redocly/openapi-core';

const TIMEOUT = 3000;

export default async (url: string, options = {}) => {
  try {
    // @ts-ignore FIXME: fix types
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, TIMEOUT);

    const res = await fetch(url, {
      signal: controller.signal,
      ...options,
      agent: getProxyAgent(),
    });
    clearTimeout(timeout);
    return res;
  } catch (e) {
    return;
  }
};
