import * as fs from 'node:fs';
import * as path from 'node:path';
import { type TestContext } from '@redocly/respect-core';

export function resolveMtlsCertificates(
  mtlsCertificates: Partial<TestContext['mtlsCerts']> = {},
  workingDir: string
) {
  const { clientCert, clientKey, caCert } = mtlsCertificates;

  return {
    clientCert: resolveCertificate(clientCert, workingDir),
    clientKey: resolveCertificate(clientKey, workingDir),
    caCert: resolveCertificate(caCert, workingDir),
  };
}

function resolveCertificate(cert: string | undefined, workingDir: string): string | undefined {
  if (!cert) return undefined;

  try {
    // Check if the string looks like a certificate content
    const isCertContent = cert.includes('-----BEGIN') && cert.includes('-----END');

    if (!isCertContent) {
      const certPath = path.resolve(workingDir, cert);

      // If not a certificate content, treat as file path
      fs.accessSync(certPath, fs.constants.R_OK);
      return fs.readFileSync(certPath, 'utf-8');
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
    /^(-----BEGIN[^-]+-----)\r?\n([A-Za-z0-9+/=\r\n\t ]+)\r?\n(-----END[^-]+-----)/
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
