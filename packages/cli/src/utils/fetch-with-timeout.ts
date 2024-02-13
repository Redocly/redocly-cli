import nodeFetch from 'node-fetch';
import AbortController from 'abort-controller';
import { HttpsProxyAgent } from 'https-proxy-agent';

const TIMEOUT = 3000;

export default async (url: string, options = {}) => {
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, TIMEOUT);

    const res = await nodeFetch(url, { signal: controller.signal, ...options, agent });
    clearTimeout(timeout);
    return res;
  } catch (e) {
    return;
  }
};
