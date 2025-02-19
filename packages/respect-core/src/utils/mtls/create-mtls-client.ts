import { Client } from 'undici';

import type { TestContext } from '../../types';

export function createMtlsClient(
  parsedPathToFetch: string,
  mtlsCerts: TestContext['mtlsCerts'] = {}
) {
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
