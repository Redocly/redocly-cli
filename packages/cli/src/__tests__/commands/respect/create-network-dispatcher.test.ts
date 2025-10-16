import { ProxyAgent } from 'undici';
import { createNetworkDispatcher } from '../../../commands/respect/connection-client.js';

describe('createNetworkDispatcher', () => {
  it('should create a client with the correct certificates', () => {
    const client = createNetworkDispatcher('https://example.com', {
      clientCert: '-----BEGIN CERTIFICATE-----\nclientCert\n-----END CERTIFICATE-----',
      clientKey: '-----BEGIN PRIVATE KEY-----\nclientKey\n-----END PRIVATE KEY-----',
      caCert: '-----BEGIN CERTIFICATE-----\ncaCert\n-----END CERTIFICATE-----',
    });
    expect(client).toBeDefined();
  });

  it('should create a client with the correct proxy', () => {
    const originalProxy = process.env.HTTPS_PROXY;
    process.env.HTTPS_PROXY = 'http://localhost:8080';

    const client = createNetworkDispatcher('https://example.com');
    expect(client).toBeDefined();
    expect(client).toBeInstanceOf(ProxyAgent);

    if (originalProxy) {
      process.env.HTTPS_PROXY = originalProxy;
    } else {
      delete process.env.HTTPS_PROXY;
    }
  });

  it('should create a client with the correct proxy and certificates', () => {
    const originalProxy = process.env.HTTPS_PROXY;
    process.env.HTTPS_PROXY = 'http://localhost:8080';
    const client = createNetworkDispatcher('https://example.com', {
      clientCert: '-----BEGIN CERTIFICATE-----\nclientCert\n-----END CERTIFICATE-----',
      clientKey: '-----BEGIN PRIVATE KEY-----\nclientKey\n-----END PRIVATE KEY-----',
      caCert: '-----BEGIN CERTIFICATE-----\ncaCert\n-----END CERTIFICATE-----',
    });
    expect(client).toBeDefined();
    expect(client).toBeInstanceOf(ProxyAgent);

    if (originalProxy) {
      process.env.HTTPS_PROXY = originalProxy;
    } else {
      delete process.env.HTTPS_PROXY;
    }
  });

  it('should not create a client if the proxy and certificates are not provided', () => {
    const client = createNetworkDispatcher('https://example.com');
    expect(client).toBeUndefined();
  });
});
