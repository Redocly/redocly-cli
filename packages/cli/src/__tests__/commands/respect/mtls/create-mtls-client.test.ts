import {
  createMtlsClient,
  withMtlsClientIfNeeded,
  type MtlsPerDomainCerts,
} from '../../../../commands/respect/mtls/create-mtls-client.js';

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

describe('withMtlsClientIfNeeded', () => {
  it('should match domain by exact origin', () => {
    const perDomainCerts: MtlsPerDomainCerts = {
      'https://localhost:3443': {
        clientCert: '-----BEGIN CERTIFICATE-----\ncert\n-----END CERTIFICATE-----',
        clientKey: '-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----',
      },
    };

    const customFetch = withMtlsClientIfNeeded(perDomainCerts);
    expect(customFetch).not.toBe(fetch);
    expect(typeof customFetch).toBe('function');
  });

  it('should match domain by hostname', () => {
    const perDomainCerts: MtlsPerDomainCerts = {
      localhost: {
        clientCert: '-----BEGIN CERTIFICATE-----\ncert\n-----END CERTIFICATE-----',
        clientKey: '-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----',
      },
    };

    const customFetch = withMtlsClientIfNeeded(perDomainCerts);
    expect(customFetch).not.toBe(fetch);
    expect(typeof customFetch).toBe('function');
  });

  it('should handle multiple domains', () => {
    const perDomainCerts: MtlsPerDomainCerts = {
      'https://localhost:3443': {
        clientCert: '-----BEGIN CERTIFICATE-----\ncert1\n-----END CERTIFICATE-----',
        clientKey: '-----BEGIN PRIVATE KEY-----\nkey1\n-----END PRIVATE KEY-----',
      },
      'https://api.example.com': {
        clientCert: '-----BEGIN CERTIFICATE-----\ncert2\n-----END CERTIFICATE-----',
        clientKey: '-----BEGIN PRIVATE KEY-----\nkey2\n-----END PRIVATE KEY-----',
      },
    };

    const customFetch = withMtlsClientIfNeeded(perDomainCerts);
    expect(customFetch).not.toBe(fetch);
    expect(typeof customFetch).toBe('function');
  });
});
