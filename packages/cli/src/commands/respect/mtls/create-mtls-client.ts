import { Client, type RequestInfo, type RequestInit, fetch } from 'undici';

export type MtlsCerts = {
  clientCert?: string;
  clientKey?: string;
  caCert?: string;
};

export type MtlsPerDomainCerts = {
  [domain: string]: MtlsCerts;
};

export function createMtlsClient(parsedPathToFetch: string, mtlsCerts: MtlsCerts = {}) {
  const { clientCert, clientKey, caCert } = mtlsCerts;

  if (!clientCert || !clientKey) {
    return undefined;
  }

  const baseUrl = new URL(parsedPathToFetch).origin;

  return new Client(baseUrl, {
    connect: {
      key: Buffer.from(clientKey),
      cert: Buffer.from(clientCert),
      ...(caCert && { ca: Buffer.from(caCert) }),
      rejectUnauthorized: true,
    },
  });
}

function selectCertsForDomain(
  url: string,
  perDomainCerts: MtlsPerDomainCerts
): MtlsCerts | undefined {
  const parsedUrl = new URL(url);

  return perDomainCerts[parsedUrl.origin] || perDomainCerts[parsedUrl.hostname];
}

export function withMtlsClientIfNeeded(perDomainCerts?: MtlsPerDomainCerts) {
  if (!perDomainCerts || Object.keys(perDomainCerts).length === 0) {
    return fetch;
  }

  return function fetchWithMtls(input: string | URL | RequestInfo, init?: RequestInit) {
    const url = typeof input === 'string' ? input : 'url' in input ? input.url : input.toString();
    const mtlsCerts = selectCertsForDomain(url, perDomainCerts);

    if (!mtlsCerts) {
      return fetch(input, init);
    }

    const client = createMtlsClient(url, mtlsCerts);
    return fetch(input, {
      ...init,
      dispatcher: client,
    });
  };
}
