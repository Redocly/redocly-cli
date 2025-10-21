import { HttpsProxyAgent } from 'https-proxy-agent';

export function getProxyUrl(): string | undefined {
  return process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
}

export function getProxyAgent() {
  const proxy = getProxyUrl();
  return proxy ? new HttpsProxyAgent(proxy) : undefined;
}
