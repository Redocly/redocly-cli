import { isPlainObject } from '@redocly/openapi-core';

// JSON Pointer escaping for identity-key content: keys become pointer segments.
function esc(value: string): string {
  return value.replace(/~/g, '~0').replace(/\//g, '~1');
}

type IdentityKeyFn = (value: Record<string, unknown>) => string | undefined;

// Identity keys for list items that have a natural identity.
// Everything else falls back to positional matching (see spec §5.2).
const IDENTITY_KEYS: Record<string, IdentityKeyFn> = {
  Parameter: (v) =>
    typeof v.in === 'string' && typeof v.name === 'string'
      ? `{${esc(v.in)}:${esc(v.name)}}`
      : undefined,
  Server: (v) => (typeof v.url === 'string' ? `{${esc(v.url)}}` : undefined),
  Tag: (v) => (typeof v.name === 'string' ? `{${esc(v.name)}}` : undefined),
  SecurityRequirement: (v) => `{${Object.keys(v).sort().map(esc).join('+')}}`,
};

export function getIdentityKey(typeName: string, value: unknown): string | undefined {
  const keyFn = IDENTITY_KEYS[typeName];
  if (!keyFn || !isPlainObject(value)) return undefined;
  return keyFn(value as Record<string, unknown>);
}
