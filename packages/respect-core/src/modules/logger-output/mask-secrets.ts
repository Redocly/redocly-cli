import { isPlainObject } from '@redocly/openapi-core';
import { deepCopy } from '../../utils/deep-copy.js';

export const POTENTIALLY_SECRET_FIELDS = [
  'token',
  'access_token',
  'id_token',
  'password',
  'client_secret',
];

export function maskSecrets<T extends { [x: string]: any } | string>(
  target: T,
  secretsSet: Set<string>
): T {
  const maskValue = (value: string, secret: string): string => {
    return value.replace(secret, '*'.repeat(8));
  };

  if (typeof target === 'string') {
    let maskedString = target as string;
    secretsSet.forEach((secret) => {
      maskedString = maskedString.split(secret).join('*'.repeat(8));
    });
    return maskedString as T;
  }

  const masked = deepCopy(target);
  const maskIfContainsSecret = (value: string): string => {
    let maskedValue = value;

    for (const secret of secretsSet) {
      if (maskedValue.includes(secret)) {
        maskedValue = maskValue(maskedValue, secret);
      }
    }

    return maskedValue;
  };

  const maskRecursive = (current: any) => {
    for (const key in current) {
      if (typeof current[key] === 'string') {
        current[key] = maskIfContainsSecret(current[key]);
      } else if (isPlainObject(current[key])) {
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

  if (!obj || typeof obj !== 'object') {
    return foundTokens;
  }

  const searchInObject = (currentObj: any) => {
    if (!currentObj || typeof currentObj !== 'object') {
      return;
    }

    if (Array.isArray(currentObj)) {
      for (const item of currentObj) {
        searchInObject(item);
      }
      return;
    }

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

      if (isPlainObject(value)) {
        searchInObject(value);
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
