import { Client, ProxyAgent, type RequestInfo, type RequestInit, fetch } from 'undici';
import { getProxyUrl } from '../../utils/proxy-agent.js';

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

  // Both mTLS and proxy
  if (clientCert && clientKey && proxyUrl) {
    return new ProxyAgent({
      uri: proxyUrl,
      connect: {
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
  if (proxyUrl) {
    return new ProxyAgent({ uri: proxyUrl });
  }

  return undefined;
}

export function withConnectionClient(perDomainCerts?: MtlsPerDomainCerts) {
  const proxyUrl = getProxyUrl();

  if (!perDomainCerts || Object.keys(perDomainCerts).length === 0 && !proxyUrl) {
    return fetch;
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

    const mtlsCerts = selectCertsForDomain(url, perDomainCerts);

    const origin = new URL(url).origin;
    let dispatcher = dispatcherCache.get(origin);

    if (!dispatcher) {
      dispatcher = createNetworkDispatcher(url, mtlsCerts) || init?.dispatcher;
      if (dispatcher) {
        dispatcherCache.set(origin, dispatcher);
      }
    }

    return fetch(input, {
      ...init,
      dispatcher,
    });
  };
}

function selectCertsForDomain(
  url: string,
  perDomainCerts: MtlsPerDomainCerts
): MtlsCerts | undefined {
  const parsedUrl = new URL(url);

  return perDomainCerts[parsedUrl.origin] || perDomainCerts[parsedUrl.hostname];
}
