import { createMtlsClient } from '../../../../commands/respect/mtls/create-mtls-client.js';

describe('createMtlsClient', () => {
  it('should create a client with the correct certificates', () => {
    const client = createMtlsClient('https://example.com', {
      clientCert: '-----BEGIN CERTIFICATE-----\nclientCert\n-----END CERTIFICATE-----',
      clientKey: '-----BEGIN PRIVATE KEY-----\nclientKey\n-----END PRIVATE KEY-----',
      caCert: '-----BEGIN CERTIFICATE-----\ncaCert\n-----END CERTIFICATE-----',
    });
    expect(client).toBeDefined();
  });

  it('should not create a client if the certificates are not provided', () => {
    const client = createMtlsClient('https://example.com');
    expect(client).toBeUndefined();
  });
});
