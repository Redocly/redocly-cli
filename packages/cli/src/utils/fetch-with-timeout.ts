import { getProxyAgent } from './proxy-agent.js';
import { Agent } from 'undici';

export const DEFAULT_FETCH_TIMEOUT = 3000;

export type FetchWithTimeoutOptions = RequestInit & {
  timeout?: number;
};

export default async (url: string, { timeout, ...options }: FetchWithTimeoutOptions = {}) => {
  const dispatcher = getProxyAgent() || new Agent({ connect: { timeout } });

  const res = await fetch(url, {
    signal: timeout ? AbortSignal.timeout(timeout) : undefined,
    ...options,
    dispatcher,
  } as RequestInit);

  return res;
};
