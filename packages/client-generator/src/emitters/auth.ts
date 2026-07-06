// The auth *naming* conventions of the generated surface. Credential injection itself
// lives in the runtime (src/runtime/auth.ts); the wiring emitter only derives the
// public setter names bound to the client instance's `auth` members.

import type { SecuritySchemeModel } from '../intermediate-representation/model.js';
import { pascalCase } from './support.js';

/**
 * Public setter name for an apiKey scheme: `setApiKey` when it's the only apiKey
 * scheme (of any `in`), else `setApiKey<Key>` to disambiguate.
 */
export function apiKeySetterName(key: string, sole: boolean): string {
  return sole ? 'setApiKey' : `setApiKey${pascalCase(key)}`;
}

/**
 * The public credential-setter names the client exports for a set of schemes,
 * in emission order (`setBearer`, then `setBasicAuth`, then each apiKey setter).
 * Also seeds the reserved-identifier set (`packageIdents`) so operation names
 * can't collide with a setter.
 */
export function authSetterNames(schemes: SecuritySchemeModel[]): string[] {
  const names: string[] = [];
  if (schemes.some((s) => s.kind === 'bearer')) names.push('setBearer');
  if (schemes.some((s) => s.kind === 'basic')) names.push('setBasicAuth');
  const apiKeySchemes = schemes.filter((s) => s.kind.startsWith('apiKey'));
  for (const scheme of apiKeySchemes) {
    names.push(apiKeySetterName(scheme.key, apiKeySchemes.length === 1));
  }
  return names;
}
