import { Client, FormData, ProxyAgent, type RequestInfo, type RequestInit, fetch } from 'undici';

import { getProxyUrl, shouldBypassProxy } from '../../utils/proxy-agent.js';

export type MtlsCerts = {
  clientCert?: string;
  clientKey?: string;
  caCert?: string;
};

export type MtlsPerDomainCerts = {
  [domain: string]: MtlsCerts;
};

export function createNetworkDispatcher(parsedPathToFetch: string, mtlsCerts: MtlsCerts = {}) {
  const { clientCert, clientKey, caCert } = mtlsCerts;
  const baseUrl = new URL(parsedPathToFetch).origin;
  const proxyUrl = getProxyUrl();
  const useProxy = proxyUrl && !shouldBypassProxy(parsedPathToFetch);

  // Both mTLS and proxy
  if (clientCert && clientKey && useProxy) {
    return new ProxyAgent({
      uri: proxyUrl,
      requestTls: {
        key: Buffer.from(clientKey),
        cert: Buffer.from(clientCert),
        ...(caCert && { ca: Buffer.from(caCert) }),
        rejectUnauthorized: true,
      },
    });
  }

  // Only mTLS
  if (clientCert && clientKey) {
    return new Client(baseUrl, {
      connect: {
        key: Buffer.from(clientKey),
        cert: Buffer.from(clientCert),
        ...(caCert && { ca: Buffer.from(caCert) }),
        rejectUnauthorized: true,
      },
    });
  }

  // Only proxy
  if (useProxy) {
    return new ProxyAgent({ uri: proxyUrl });
  }

  return undefined;
}

export function withConnectionClient(perDomainCerts?: MtlsPerDomainCerts) {
  const proxyUrl = getProxyUrl();

  if (!proxyUrl && (!perDomainCerts || Object.keys(perDomainCerts).length === 0)) {
    return fetchWithUndiciFormData;
  }

  const dispatcherCache = new Map<string, Client | ProxyAgent>();

  return (input: RequestInfo, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : 'url' in input
            ? input.url
            : undefined;

    if (!url) {
      throw new Error('Invalid input URL');
    }

    const mtlsCerts = perDomainCerts ? selectCertsForDomain(url, perDomainCerts) : undefined;
    const origin = new URL(url).origin;
    let dispatcher = dispatcherCache.get(origin);

    if (!dispatcher) {
      dispatcher = createNetworkDispatcher(url, mtlsCerts) || init?.dispatcher;
      if (dispatcher) {
        dispatcherCache.set(origin, dispatcher);
      }
    }

    return fetchWithUndiciFormData(input, {
      ...init,
      dispatcher,
    });
  };
}

export function fetchWithUndiciFormData(input: RequestInfo, init?: RequestInit) {
  if (!(init?.body instanceof globalThis.FormData)) {
    return fetch(input, init);
  }

  const formData = new FormData();
  for (const [name, value] of init.body) {
    formData.append(name, value);
  }

  return fetch(input, { ...init, body: formData });
}

function selectCertsForDomain(
  url: string,
  perDomainCerts: MtlsPerDomainCerts
): MtlsCerts | undefined {
  const parsedUrl = new URL(url);

  return perDomainCerts[parsedUrl.origin] || perDomainCerts[parsedUrl.hostname];
}
