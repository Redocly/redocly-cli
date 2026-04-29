import { isPlainObject } from '@redocly/openapi-core';

import type { MtlsConfig } from '../index.js';

export function validateMtlsCommandOption(value: string | string[]): MtlsConfig | undefined {
  if (Array.isArray(value)) {
    const merged: MtlsConfig = {};

    for (const item of value) {
      if (!item) continue;
      if (typeof item === 'string') {
        const parsed = parseAndValidateMtlsConfig(item);
        Object.assign(merged, parsed);
      }
    }

    return Object.keys(merged).length > 0 ? merged : undefined;
  }

  if (!value || typeof value !== 'string') {
    return undefined;
  }

  return parseAndValidateMtlsConfig(value);
}

function parseAndValidateMtlsConfig(value: string): MtlsConfig {
  try {
    const parsed = JSON.parse(value);

    if (!isPlainObject(parsed)) {
      throw new Error(
        'mTLS config must be an object mapping domains to certificate configurations'
      );
    }

    for (const [domain, config] of Object.entries(parsed)) {
      if (!isPlainObject(config)) {
        throw new Error(`mTLS config for domain "${domain}" must be an object`);
      }

      validateCertField(config, 'clientCert', domain, true);
      validateCertField(config, 'clientKey', domain, true);
      validateCertField(config, 'caCert', domain, false);
    }

    return parsed as MtlsConfig;
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
