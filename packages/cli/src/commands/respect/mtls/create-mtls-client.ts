import { Client, type RequestInfo, type RequestInit, fetch } from 'undici';

export type MtlsCerts = {
  clientCert?: string;
  clientKey?: string;
  caCert?: string;
};

export function createMtlsClient(parsedPathToFetch: string, mtlsCerts: MtlsCerts = {}) {
  const { clientCert, clientKey, caCert } = mtlsCerts;
  const baseUrl = new URL(parsedPathToFetch).origin;

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
  return undefined;
}

export function withMtlsClientIfNeeded(mtlsCerts: MtlsCerts = {}) {
  if (!mtlsCerts) {
    return fetch;
  }

  return function fetchWithMtls(input: string | URL | RequestInfo, init?: RequestInit) {
    const url = typeof input === 'string' ? input : 'url' in input ? input.url : input.toString();
    const client = createMtlsClient(url, mtlsCerts);
    return fetch(input, {
      ...init,
      dispatcher: client,
    });
  };
}
