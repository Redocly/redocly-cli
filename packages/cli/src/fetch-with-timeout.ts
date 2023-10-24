import nodeFetch from 'node-fetch';

const TIMEOUT = 3000;

export default async (url: string, options = {}) => {
  try {
    if (!global.AbortController) {
      return nodeFetch(url, options);
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, TIMEOUT);

    // FIXME: fix this (possibly along with this issue: https://github.com/Redocly/redocly-cli/issues/1260)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const res = await nodeFetch(url, { signal: controller.signal, ...options });
    clearTimeout(timeout);
    return res;
  } catch (e) {
    return;
  }
};
