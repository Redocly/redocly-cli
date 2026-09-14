import type { Agent as AgentType, ProxyAgent as ProxyAgentType } from 'undici';

import { getProxyUrl, shouldBypassProxy } from './proxy-agent.js';

export type FetchWithTimeoutOptions = RequestInit & {
  timeout?: number;
};

export default async (url: string, { timeout, ...options }: FetchWithTimeoutOptions = {}) => {
  const proxyUrl = getProxyUrl();
  const useProxy = proxyUrl && !shouldBypassProxy(url);
  let dispatcher: AgentType | ProxyAgentType | undefined;

  const connectOptions = timeout ? { connect: { timeout } } : {};

  if (useProxy) {
    const { ProxyAgent } = await import('undici');
    dispatcher = new ProxyAgent({
      uri: proxyUrl,
      ...connectOptions,
    });
  } else if (timeout) {
    const { Agent } = await import('undici');
    dispatcher = new Agent(connectOptions);
  }

  const res = await fetch(url, {
    signal: timeout ? AbortSignal.timeout(timeout) : undefined,
    ...options,
    dispatcher,
  } as RequestInit);

  return res;
};
