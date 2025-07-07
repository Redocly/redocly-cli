import * as fs from 'node:fs';

import { resolveMtlsCertificates } from '../../../../../src/commands/respect/mtls/resolve-mtls-certificates.js';

// vi.mock must come before any variable declarations
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  const mockReadFileSync = vi.fn();
  const mockAccessSync = vi.fn();

  return {
    __esModule: true,
    default: {
      ...actual,
      accessSync: mockAccessSync,
      readFileSync: mockReadFileSync,
    },
    constants: {
      // FIXME: this is a temporary fix to make the test pass
      // @ts-expect-error
      ...actual.constants,
      R_OK: 4,
    },
    accessSync: mockAccessSync,
    readFileSync: mockReadFileSync,
  };
});

const mockReadFileSync = vi.mocked(fs.readFileSync);
const mockAccessSync = vi.mocked(fs.accessSync);

describe('resolveMtlsCertificates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default successful mock implementations
    mockAccessSync.mockImplementation(() => undefined); // successful access returns undefined
    mockReadFileSync.mockImplementation((path: any) => {
      if (path.includes('clientCert')) {
        return '-----BEGIN CERTIFICATE-----\nclientCert\n-----END CERTIFICATE-----';
      } else if (path.includes('clientKey')) {
        return '-----BEGIN PRIVATE KEY-----\nclientKey\n-----END PRIVATE KEY-----';
      } else if (path.includes('caCert')) {
        return '-----BEGIN CERTIFICATE-----\ncaCert\n-----END CERTIFICATE-----';
      } else {
        throw new Error('File not found');
      }
    });
  });

  it('should resolve certificates', () => {
    const certs = resolveMtlsCertificates(
      {
        clientCert:
          '-----BEGIN CERTIFICATE-----\nMIICWDCCAd+gAwIBAgIJAP8L\n-----END CERTIFICATE-----',
        clientKey:
          '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0B\n-----END PRIVATE KEY-----',
        caCert: '-----BEGIN CERTIFICATE-----\nMIIDXTCCAkWgAwIBAgIJAK7P\n-----END CERTIFICATE-----',
      },
      'test.yaml'
    );

    expect(certs).toEqual({
      clientCert:
        '-----BEGIN CERTIFICATE-----\nMIICWDCCAd+gAwIBAgIJAP8L\n-----END CERTIFICATE-----',
      clientKey: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0B\n-----END PRIVATE KEY-----',
      caCert: '-----BEGIN CERTIFICATE-----\nMIIDXTCCAkWgAwIBAgIJAK7P\n-----END CERTIFICATE-----',
    });
  });

  it('should resolve certificates from file', () => {
    const certs = resolveMtlsCertificates(
      {
        clientCert: 'clientCert.pem',
        clientKey: 'clientKey.pem',
        caCert: 'caCert.pem',
      },
      'test.yaml'
    );

    expect(certs).toEqual({
      clientCert: '-----BEGIN CERTIFICATE-----\nclientCert\n-----END CERTIFICATE-----',
      clientKey: '-----BEGIN PRIVATE KEY-----\nclientKey\n-----END PRIVATE KEY-----',
      caCert: '-----BEGIN CERTIFICATE-----\ncaCert\n-----END CERTIFICATE-----',
    });
  });

  it('should throw error if file not found', () => {
    // Override default mock for this specific test
    mockAccessSync.mockImplementation(() => {
      throw new Error('File not found');
    });

    expect(() =>
      resolveMtlsCertificates(
        {
          clientCert: 'clientCert.pem',
          clientKey: 'clientKey.pem',
          caCert: 'caCert.pem',
        },
        'test.yaml'
      )
    ).toThrow('Failed to read certificate: File not found');
  });

  it('should resolve certificate content in case some cert is not provided', () => {
    const certs = resolveMtlsCertificates(
      {
        clientCert: 'clientCert.pem',
        clientKey: 'clientKey.pem',
      },
      'test.yaml'
    );

    expect(certs).toEqual({
      clientCert: '-----BEGIN CERTIFICATE-----\nclientCert\n-----END CERTIFICATE-----',
      clientKey: '-----BEGIN PRIVATE KEY-----\nclientKey\n-----END PRIVATE KEY-----',
      caCert: undefined,
    });
  });

  it('should return undefined if cert is not provided', () => {
    const certs = resolveMtlsCertificates({}, 'test.yaml');

    expect(certs).toEqual({
      clientCert: undefined,
      clientKey: undefined,
      caCert: undefined,
    });
  });

  it('should throw error if certificate is not valid', () => {
    expect(() =>
      resolveMtlsCertificates(
        {
          clientCert: '-----BEGIN CERTIFICATE--22323-----END CERTIFICATE-----',
        },
        'test.yaml'
      )
    ).toThrow('Invalid certificate format');
  });
});
