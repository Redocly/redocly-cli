import { getComponentRoot, type NodeLookup } from '../node-map/chain.js';
import type { Direction } from './types.js';

export function mergeDirections(a: Direction, b: Direction): Direction {
  if (a === b) return a;
  if (a === 'neutral') return b;
  if (b === 'neutral') return a;
  return 'both';
}

export class UsageIndex {
  private sitesByTarget = new Map<string, Set<string>>();

  constructor(
    edges: Array<{ site: string; target: string }>,
    private lookup: NodeLookup
  ) {
    for (const { site, target } of edges) {
      const root = getComponentRoot(target, lookup) ?? target;
      if (!this.sitesByTarget.has(root)) this.sitesByTarget.set(root, new Set());
      this.sitesByTarget.get(root)!.add(site);
    }
  }

  /** `resolveSiteDirection` receives the key of the node that holds the reference. */
  directionOf(componentKey: string, resolveSiteDirection: (site: string) => Direction): Direction {
    const seen = new Set<string>();
    const visit = (key: string): Direction => {
      if (seen.has(key)) return 'neutral'; // cycle guard
      seen.add(key);
      let result: Direction = 'neutral';
      for (const site of this.sitesByTarget.get(key) ?? []) {
        // a ref site inside another component chains to that component's own usage
        const siteComponentRoot = getComponentRoot(site, this.lookup);
        const siteDirection = siteComponentRoot
          ? visit(siteComponentRoot)
          : resolveSiteDirection(site);
        result = mergeDirections(result, siteDirection);
        if (result === 'both') return 'both';
      }
      return result;
    };
    return visit(getComponentRoot(componentKey, this.lookup) ?? componentKey);
  }
}
