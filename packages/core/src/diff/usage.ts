import type { NodeEntry, Reference } from '../node-map/types.js';
import { mergeDirections } from './specs/direction.js';
import type { DiffSpec, Direction, Pair } from './types.js';

/**
 * The direction every referenced node gets from the sites that reference it, over both
 * documents at once so a shared component keeps one direction. A site inside another
 * referenced node borrows that node's direction, which the repeated passes settle: merging
 * only ever widens a direction, so the answers stop changing after a few rounds, and a
 * reference cycle simply contributes nothing.
 */
export function usageDirections(
  references: Reference[],
  pairOf: Map<NodeEntry, Pair>,
  spec: DiffSpec
): (node: NodeEntry) => Direction {
  const directions = new Map<Pair, Direction>();
  const fromUsage = (node: NodeEntry): Direction => {
    const pair = pairOf.get(node);
    return (pair && directions.get(pair)) ?? 'neutral';
  };

  const edges = references.flatMap(({ from, to }) => {
    const target = pairOf.get(spec.referenceTarget?.(to) ?? to);
    return target ? [{ from, target }] : [];
  });

  for (let settled = false; !settled; ) {
    settled = true;
    for (const { from, target } of edges) {
      const merged = mergeDirections(
        directions.get(target) ?? 'neutral',
        spec.directionOf(from, fromUsage)
      );
      if (merged !== directions.get(target)) {
        directions.set(target, merged);
        settled = false;
      }
    }
  }

  return fromUsage;
}
