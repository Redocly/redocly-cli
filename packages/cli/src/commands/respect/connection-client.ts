import { Client, ProxyAgent, type RequestInfo, type RequestInit, fetch } from 'undici';
import { getProxyUrl } from '../../utils/proxy-agent.js';

export type MtlsCerts = {
  clientCert?: string;
  clientKey?: string;
  caCert?: string;
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
        // Keeping this `false` to have the ability to call different servers in one Arazzo file
        // some of them might not require mTLS.
        rejectUnauthorized: false,
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
        // Keeping this `false` to have the ability to call different servers in one Arazzo file
        // some of them might not require mTLS.
        rejectUnauthorized: false,
      },
    });
  }

  // Only proxy
  if (proxyUrl) {
    return new ProxyAgent({ uri: proxyUrl });
  }

  return undefined;
}

export function withConnectionClientIfNeeded(mtlsCerts: MtlsCerts = {}) {
  const proxyUrl = getProxyUrl();

  if (!mtlsCerts && !proxyUrl) {
    return fetch;
  }

  return function fetchWithDispatcher(input: string | URL | RequestInfo, init?: RequestInit) {
    const url = typeof input === 'string' ? input : 'url' in input ? input.url : input.toString();

    return fetch(input, {
      ...init,
      dispatcher: createNetworkDispatcher(url, mtlsCerts) || init?.dispatcher,
    });
  };
}
