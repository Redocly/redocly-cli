import type { Polarity } from '../types.js';
import { ancestorChain, type NodeLookup } from './chain.js';

/**
 * The pointer of the reusable component a node belongs to, or `undefined` when the
 * node is not inside one. Found structurally: the type tree marks the container as
 * `Components`, its children are the per-kind maps (`NamedSchemas`, …), and their
 * children are the components themselves.
 */
export function getComponentRoot(pointer: string, lookup: NodeLookup): string | undefined {
  const chain = ancestorChain(pointer, lookup);
  const componentsIndex = chain.findIndex((entry) => entry.typeName === 'Components');
  return componentsIndex === -1 ? undefined : chain[componentsIndex + 2]?.pointer;
}

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

  /** `resolveSitePolarity` receives the pointer of the node that holds the reference. */
  polarityOf(componentPointer: string, resolveSitePolarity: (site: string) => Polarity): Polarity {
    const seen = new Set<string>();
    const visit = (pointer: string): Polarity => {
      if (seen.has(pointer)) return 'neutral'; // cycle guard
      seen.add(pointer);
      let result: Polarity = 'neutral';
      for (const site of this.sitesByTarget.get(pointer) ?? []) {
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
    return visit(getComponentRoot(componentPointer, this.lookup) ?? componentPointer);
  }
}
