import type { Polarity } from '../types.js';

export function getComponentRoot(pointer: string): string | undefined {
  const match = pointer.match(/^(#\/components\/[^/]+\/[^/]+)/);
  return match?.[1];
}

export function mergePolarity(a: Polarity, b: Polarity): Polarity {
  if (a === b) return a;
  if (a === 'neutral') return b;
  if (b === 'neutral') return a;
  return 'both';
}

export class UsageIndex {
  private sitesByTarget = new Map<string, Set<string>>();

  constructor(edges: Array<{ site: string; target: string }>) {
    for (const { site, target } of edges) {
      const root = getComponentRoot(target) ?? target;
      if (!this.sitesByTarget.has(root)) this.sitesByTarget.set(root, new Set());
      this.sitesByTarget.get(root)!.add(site);
    }
  }

  polarityOf(componentPointer: string, resolveSitePolarity: (site: string) => Polarity): Polarity {
    const seen = new Set<string>();
    const visit = (pointer: string): Polarity => {
      if (seen.has(pointer)) return 'neutral'; // cycle guard
      seen.add(pointer);
      let result: Polarity = 'neutral';
      for (const site of this.sitesByTarget.get(pointer) ?? []) {
        // a ref site inside another component chains to that component's own usage
        const siteComponentRoot = getComponentRoot(site);
        const sitePolarity = siteComponentRoot
          ? visit(siteComponentRoot)
          : resolveSitePolarity(site);
        result = mergePolarity(result, sitePolarity);
        if (result === 'both') return 'both';
      }
      return result;
    };
    return visit(getComponentRoot(componentPointer) ?? componentPointer);
  }
}
