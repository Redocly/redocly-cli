import { HttpsProxyAgent } from 'https-proxy-agent';

export function getProxyUrl(): string | undefined {
  return (
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.https_proxy
  );
}

export function getProxyAgent() {
  const proxy = getProxyUrl();
  return proxy ? new HttpsProxyAgent(proxy) : undefined;
}

export function shouldBypassProxy(url: string): boolean {
  const noProxy = process.env.NO_PROXY || process.env.no_proxy;
  if (!noProxy) return false;

  const entries = noProxy
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (entries.length === 0) return false;

  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }

  return entries.some((entry) => {
    if (entry === '*') return true;
    if (hostname === entry) return true;
    if (entry.startsWith('.') && hostname.endsWith(entry)) return true;
    if (!entry.startsWith('.') && hostname.endsWith('.' + entry)) return true;
    return false;
  });
}
