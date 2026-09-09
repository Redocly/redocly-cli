import { type Location } from '../ref-utils.js';
import { type ResolvedRefChainHop } from '../resolve.js';

export type RefTarget = { node: unknown; location: Location };

// a composed $ref in the chain is the effective target, so the composition survives bundling
export function effectiveRefTarget(resolved: {
  node: unknown;
  location: Location;
  chain?: ResolvedRefChainHop[];
}): RefTarget {
  return resolved.chain?.[0] ?? { node: resolved.node, location: resolved.location };
}
