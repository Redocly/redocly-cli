import { getComponentRoot, type NodeLookup } from '../node-map/chain.js';
import type { Polarity } from './types.js';

export function mergePolarity(a: Polarity, b: Polarity): Polarity {
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

  /** `resolveSitePolarity` receives the key of the node that holds the reference. */
  polarityOf(componentKey: string, resolveSitePolarity: (site: string) => Polarity): Polarity {
    const seen = new Set<string>();
    const visit = (key: string): Polarity => {
      if (seen.has(key)) return 'neutral'; // cycle guard
      seen.add(key);
      let result: Polarity = 'neutral';
      for (const site of this.sitesByTarget.get(key) ?? []) {
        // a ref site inside another component chains to that component's own usage
        const siteComponentRoot = getComponentRoot(site, this.lookup);
        const sitePolarity = siteComponentRoot
          ? visit(siteComponentRoot)
          : resolveSitePolarity(site);
        result = mergePolarity(result, sitePolarity);
        if (result === 'both') return 'both';
      }
      return result;
    };
    return visit(getComponentRoot(componentKey, this.lookup) ?? componentKey);
  }
}
