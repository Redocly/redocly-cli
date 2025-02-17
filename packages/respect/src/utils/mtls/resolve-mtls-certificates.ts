import fs, { constants } from 'node:fs';
import { type TestContext } from '../../types';

export function resolveMtlsCertificates(mtlsCertificates: Partial<TestContext['mtlsCerts']> = {}) {
  const { clientCert, clientKey, caCert } = mtlsCertificates;

  return {
    clientCert: resolveCertificate(clientCert),
    clientKey: resolveCertificate(clientKey),
    caCert: resolveCertificate(caCert),
  };
}

function resolveCertificate(cert: string | undefined): string | undefined {
  if (!cert) return undefined;

  try {
    // Check if the string looks like a certificate content
    const isCertContent = cert.includes('-----BEGIN') && cert.includes('-----END');

    if (!isCertContent) {
      // If not a certificate content, treat as file path
      fs.accessSync(cert, constants.R_OK);
      return fs.readFileSync(cert, 'utf-8');
    }

    // Return the certificate content as-is
    return formatCertificate(cert);
  } catch (error: any) {
    throw new Error(`Failed to read certificate: ${error.message}`);
  }
}

function formatCertificate(cert: string): string {
  // Split the content into header, body, and footer
  const matches = cert.match(
    /^(-----BEGIN[^-]+-----)\s*([A-Za-z0-9+/=\s]+)\s*(-----END[^-]+-----)/,
  );
  if (!matches) {
    throw new Error('Invalid certificate format');
  }

  const [, header, body, footer] = matches;

  // Format the body with proper line breaks (64 characters per line)
  const formattedBody =
    body
      .replace(/\s+/g, '') // Remove all whitespace
      .match(/.{1,64}/g) // Split into 64-character chunks
      ?.join('\n') || ''; // Join with newlines

  // Reconstruct the properly formatted certificate
  return `${header}\n${formattedBody}\n${footer}`;
}
