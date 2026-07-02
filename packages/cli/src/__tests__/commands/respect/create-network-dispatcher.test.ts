import { Client, ProxyAgent } from 'undici';

import {
  createNetworkDispatcher,
  type MtlsPerDomainCerts,
  withConnectionClient,
} from '../../../commands/respect/connection-client.js';
import { shouldBypassProxy } from '../../../utils/proxy-agent.js';

describe('shouldBypassProxy', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    savedEnv.NO_PROXY = process.env.NO_PROXY;
    savedEnv.no_proxy = process.env.no_proxy;
    delete process.env.NO_PROXY;
    delete process.env.no_proxy;
  });

  afterEach(() => {
    if (savedEnv.NO_PROXY !== undefined) {
      process.env.NO_PROXY = savedEnv.NO_PROXY;
    } else {
      delete process.env.NO_PROXY;
    }
    if (savedEnv.no_proxy !== undefined) {
      process.env.no_proxy = savedEnv.no_proxy;
    } else {
      delete process.env.no_proxy;
    }
  });

  it('should return false when NO_PROXY is not set', () => {
    expect(shouldBypassProxy('http://localhost:8000/endpoint')).toBe(false);
  });

  it('should bypass proxy for exact hostname match', () => {
    process.env.NO_PROXY = 'localhost';
    expect(shouldBypassProxy('http://localhost:8000/endpoint')).toBe(true);
  });

  it('should bypass proxy for domain suffix match with leading dot', () => {
    process.env.NO_PROXY = '.domain.com';
    expect(shouldBypassProxy('http://sub.domain.com/endpoint')).toBe(true);
    expect(shouldBypassProxy('http://domain.com/endpoint')).toBe(false);
  });

  it('should bypass proxy for domain suffix match without leading dot', () => {
    process.env.NO_PROXY = 'domain.com';
    expect(shouldBypassProxy('http://sub.domain.com/endpoint')).toBe(true);
    expect(shouldBypassProxy('http://domain.com/endpoint')).toBe(true);
  });

  it('should bypass proxy for wildcard', () => {
    process.env.NO_PROXY = '*';
    expect(shouldBypassProxy('http://anything.example.com/endpoint')).toBe(true);
  });

  it('should handle multiple entries', () => {
    process.env.NO_PROXY = 'localhost,.domain.com,other.org';
    expect(shouldBypassProxy('http://localhost:8000/endpoint')).toBe(true);
    expect(shouldBypassProxy('http://sub.domain.com/endpoint')).toBe(true);
    expect(shouldBypassProxy('http://other.org/endpoint')).toBe(true);
    expect(shouldBypassProxy('http://external.com/endpoint')).toBe(false);
  });

  it('should respect no_proxy (lowercase)', () => {
    process.env.no_proxy = 'localhost';
    expect(shouldBypassProxy('http://localhost:8000/endpoint')).toBe(true);
  });

  it('should be case-insensitive for hostnames', () => {
    process.env.NO_PROXY = 'LocalHost';
    expect(shouldBypassProxy('http://localhost:8000/endpoint')).toBe(true);
  });
});

describe('createNetworkDispatcher', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    savedEnv.HTTPS_PROXY = process.env.HTTPS_PROXY;
    savedEnv.HTTP_PROXY = process.env.HTTP_PROXY;
    savedEnv.NO_PROXY = process.env.NO_PROXY;
    savedEnv.no_proxy = process.env.no_proxy;
    delete process.env.HTTPS_PROXY;
    delete process.env.HTTP_PROXY;
    delete process.env.NO_PROXY;
    delete process.env.no_proxy;
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value !== undefined) {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    }
  });

  it('should create a client with the correct certificates', () => {
    const client = createNetworkDispatcher('https://example.com', {
      clientCert: '-----BEGIN CERTIFICATE-----\nclientCert\n-----END CERTIFICATE-----',
      clientKey: '-----BEGIN PRIVATE KEY-----\nclientKey\n-----END PRIVATE KEY-----',
      caCert: '-----BEGIN CERTIFICATE-----\ncaCert\n-----END CERTIFICATE-----',
    });
    expect(client).toBeDefined();
  });

  it('should create a client with the correct proxy', () => {
    process.env.HTTPS_PROXY = 'http://localhost:8080';

    const client = createNetworkDispatcher('https://example.com');
    expect(client).toBeDefined();
    expect(client).toBeInstanceOf(ProxyAgent);
  });

  it('should create a client with the correct proxy and certificates', () => {
    process.env.HTTPS_PROXY = 'http://localhost:8080';
    const client = createNetworkDispatcher('https://example.com', {
      clientCert: '-----BEGIN CERTIFICATE-----\nclientCert\n-----END CERTIFICATE-----',
      clientKey: '-----BEGIN PRIVATE KEY-----\nclientKey\n-----END PRIVATE KEY-----',
      caCert: '-----BEGIN CERTIFICATE-----\ncaCert\n-----END CERTIFICATE-----',
    });
    expect(client).toBeDefined();
    expect(client).toBeInstanceOf(ProxyAgent);
  });

  it('should not create a client if the proxy and certificates are not provided', () => {
    const client = createNetworkDispatcher('https://example.com');
    expect(client).toBeUndefined();
  });

  it('should bypass proxy when URL matches NO_PROXY', () => {
    process.env.HTTPS_PROXY = 'http://proxy:8080';
    process.env.NO_PROXY = 'localhost,.internal.com';

    const client = createNetworkDispatcher('http://localhost:8000/endpoint');
    expect(client).toBeUndefined();
  });

  it('should still use proxy for URLs not in NO_PROXY', () => {
    process.env.HTTPS_PROXY = 'http://proxy:8080';
    process.env.NO_PROXY = 'localhost,.internal.com';

    const client = createNetworkDispatcher('https://external.com/endpoint');
    expect(client).toBeInstanceOf(ProxyAgent);
  });

  it('should use mTLS without proxy when URL matches NO_PROXY', () => {
    process.env.HTTPS_PROXY = 'http://proxy:8080';
    process.env.NO_PROXY = 'localhost';

    const client = createNetworkDispatcher('https://localhost:3443/endpoint', {
      clientCert: '-----BEGIN CERTIFICATE-----\nclientCert\n-----END CERTIFICATE-----',
      clientKey: '-----BEGIN PRIVATE KEY-----\nclientKey\n-----END PRIVATE KEY-----',
    });
    expect(client).toBeDefined();
    expect(client).toBeInstanceOf(Client);
    expect(client).not.toBeInstanceOf(ProxyAgent);
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

    const customFetch = withConnectionClient(perDomainCerts);
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

    const customFetch = withConnectionClient(perDomainCerts);
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

    const customFetch = withConnectionClient(perDomainCerts);
    expect(customFetch).not.toBe(fetch);
    expect(typeof customFetch).toBe('function');
  });
});
