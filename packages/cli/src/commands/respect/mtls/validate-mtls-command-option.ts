import type { MtlsConfig } from '../index.js';

export function validateMtlsCommandOption(value: string): MtlsConfig | undefined {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(value);

    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(
        'mTLS config must be an object mapping domains to certificate configurations'
      );
    }

    for (const [domain, config] of Object.entries(parsed)) {
      if (typeof config !== 'object' || Array.isArray(config)) {
        throw new Error(`mTLS config for domain "${domain}" must be an object`);
      }

      const certConfig = config as Record<string, unknown>;

      validateCertField(certConfig, 'clientCert', domain, true);
      validateCertField(certConfig, 'clientKey', domain, true);
      validateCertField(certConfig, 'caCert', domain, false);
    }

    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON for --mtls option: ${error.message}`);
    }
    throw error;
  }
}

function validateCertField(
  certConfig: Record<string, unknown>,
  fieldName: string,
  domain: string,
  required: boolean
): void {
  const value = certConfig[fieldName];

  if (!value) {
    if (required) {
      throw new Error(`${fieldName} is required for domain "${domain}"`);
    }
    return;
  }

  if (typeof value !== 'string') {
    throw new Error(`${fieldName} for domain "${domain}" must be a string`);
  }
}
