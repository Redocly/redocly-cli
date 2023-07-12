import nodeFetch from 'node-fetch';
import AbortController from 'abort-controller';

const TIMEOUT = 3000;

export default async (url: string, options = {}) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, TIMEOUT);

    const res = await nodeFetch(url, { signal: controller.signal, ...options });
    clearTimeout(timeout);
    return res;
  } catch (e) {
    return;
  }
};
