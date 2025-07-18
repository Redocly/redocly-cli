import { getProxyAgent } from './proxy-agent.js';
import { Agent } from 'undici';

export type FetchWithTimeoutOptions = RequestInit & {
  timeout?: number;
};

export default async (url: string, { timeout, ...options }: FetchWithTimeoutOptions = {}) => {
  const dispatcher = getProxyAgent() || (timeout ? new Agent({ connect: { timeout } }) : undefined);

  const res = await fetch(url, {
    signal: timeout ? AbortSignal.timeout(timeout) : undefined,
    ...options,
    dispatcher,
  } as RequestInit);

  return res;
};
