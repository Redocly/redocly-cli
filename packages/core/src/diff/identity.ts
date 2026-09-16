import type { IdentityFn } from '../node-map/types.js';
import { escapePointerFragment } from '../ref-utils.js';

type ListItemIdentity = (node: Record<string, unknown>) => string | undefined;

// Identity segments for list items that have a natural identity; everything else keeps
// its position. Each part is pointer-escaped so a `/` inside a name cannot forge a level.
const LIST_ITEM_IDENTITIES: Record<string, ListItemIdentity> = {
  Parameter: (parameter) =>
    typeof parameter.in === 'string' && typeof parameter.name === 'string'
      ? `{${escapePointerFragment(parameter.in)}:${escapePointerFragment(parameter.name)}}`
      : undefined,
  Server: (server) =>
    typeof server.url === 'string' ? `{${escapePointerFragment(server.url)}}` : undefined,
  Tag: (tag) => (typeof tag.name === 'string' ? `{${escapePointerFragment(tag.name)}}` : undefined),
  SecurityRequirement: (requirement) =>
    `{${Object.keys(requirement).sort().map(escapePointerFragment).join('+')}}`,
};

export const identityOf: IdentityFn = (node, { typeName, parent }) => {
  if (!Array.isArray(parent)) return undefined;
  const segment = LIST_ITEM_IDENTITIES[typeName]?.(node);
  return segment === undefined ? undefined : { segment };
};
