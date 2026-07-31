import { isPlainObject } from '@redocly/openapi-core';

import { deepCopy } from '../../utils/deep-copy.js';

export const POTENTIALLY_SECRET_FIELDS = [
  'token',
  'access_token',
  'id_token',
  'password',
  'client_secret',
];

/**
 * A secret can appear in a log or capture already encoded: a JSON body
 * escapes quotes and backslashes, a form-urlencoded body or a URL
 * percent-encodes special characters. Mask those variants along with the
 * raw value.
 */
function collectSecretPatterns(secretsSet: Set<string>): string[] {
  const patterns = new Set<string>();
  for (const secret of secretsSet) {
    if (!secret) continue;
    patterns.add(secret);
    patterns.add(JSON.stringify(secret).slice(1, -1));
    patterns.add(encodeURIComponent(secret));
    // URLSearchParams serializes to `secret=value`; drop the key to keep
    // the form-urlencoded variant (spaces become `+`, unlike encodeURIComponent).
    patterns.add(new URLSearchParams([['secret', secret]]).toString().slice('secret='.length));
  }
  return Array.from(patterns);
}

export function maskSecrets<T extends { [x: string]: any } | string>(
  target: T,
  secretsSet: Set<string>
): T {
  const patterns = collectSecretPatterns(secretsSet);
  const maskString = (value: string): string => {
    let maskedValue = value;
    for (const pattern of patterns) {
      if (maskedValue.includes(pattern)) {
        maskedValue = maskedValue.split(pattern).join('*'.repeat(8));
      }
    }
    return maskedValue;
  };

  if (typeof target === 'string') {
    return maskString(target) as T;
  }

  const masked = deepCopy(target);
  const maskRecursive = (current: any) => {
    for (const key in current) {
      if (typeof current[key] === 'string') {
        current[key] = maskString(current[key]);
      } else if (isPlainObject(current[key]) || Array.isArray(current[key])) {
        // Skip special objects that should not be modified
        if (
          !(current[key] instanceof File) &&
          !(current[key] instanceof ArrayBuffer) &&
          !(current[key] instanceof Blob) &&
          !(current[key] instanceof FormData) &&
          !(current[key] instanceof Date) &&
          !(current[key] instanceof RegExp) &&
          !(current[key] instanceof Map) &&
          !(current[key] instanceof Set) &&
          !(current[key] instanceof URL) &&
          !(current[key] instanceof Error)
        ) {
          maskRecursive(current[key]);
        }
      }
    }
  };
  maskRecursive(masked);

  return masked;
}

export function containsSecret(value: string, secretsSet: Set<string>): boolean {
  return Array.from(secretsSet).some((secret) => value.includes(secret));
}

export function findPotentiallySecretObjectFields(
  obj: any,
  tokenKeys: string[] = POTENTIALLY_SECRET_FIELDS
): string[] {
  const foundTokens: string[] = [];

  if (!isPlainObject(obj) && !Array.isArray(obj)) {
    return foundTokens;
  }

  const searchInObject = (currentObj: unknown) => {
    if (Array.isArray(currentObj)) {
      for (const item of currentObj) {
        searchInObject(item);
      }
      return;
    }

    if (isPlainObject(currentObj)) {
      for (const key in currentObj) {
        const value = currentObj[key];

        // Check if the key matches any of the token keys (case-insensitive)
        if (tokenKeys.some((tokenKey) => tokenKey.toLowerCase() === key.toLowerCase())) {
          if (typeof value === 'string' && value.trim()) {
            foundTokens.push(value);
          }
        }

        if (typeof value === 'string' && value.trim()) {
          for (const tokenKey of tokenKeys) {
            const match = value.match(new RegExp(`${tokenKey}=([^;\\s]+)`, 'i'));
            const [, secretValue] = match || [];
            if (secretValue) {
              foundTokens.push(secretValue);
            }
          }
        }

        if (isPlainObject(value) || Array.isArray(value)) {
          searchInObject(value);
        }
      }
    }
  };

  searchInObject(obj);
  return foundTokens;
}

export function conditionallyMaskSecrets<T extends { [x: string]: any } | string>({
  value,
  noSecretsMasking,
  secretsSet,
}: {
  value: T;
  noSecretsMasking: boolean;
  secretsSet: Set<string>;
}): T {
  return noSecretsMasking ? value : maskSecrets(value, secretsSet);
}
