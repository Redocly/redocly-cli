import type { NodeEntry, Reference } from '../node-tree/types.js';
import type { DiffNode, Direction, Directions } from './types.js';

const bothDirections: Direction[] = ['request', 'response'];

/** Both sides' directions, in one order so that equal sets compare equal. */
export function mergeDirections(left: Direction[], right: Direction[]): Direction[] {
  return bothDirections.filter(
    (direction) => left.includes(direction) || right.includes(direction)
  );
}

export function opposite(direction: Direction): Direction {
  return direction === 'request' ? 'response' : 'request';
}

/**
 * The way the data in a node travels. The node's position says it first; where it says nothing,
 * the node takes the direction of every site that references it or one of its ancestors, over
 * both documents, so a shared component keeps one direction. A site inside another referenced
 * node borrows that node's direction, which the repeated passes settle: merging only ever widens
 * a direction, so the answers stop changing after a few rounds, and a reference cycle simply
 * contributes nothing.
 */
export function directionsOf(
  references: Reference[],
  diffNodeOf: Map<NodeEntry, DiffNode>,
  directions: Directions
): (node: NodeEntry) => Direction[] {
  const usage = new Map<DiffNode, Direction[]>();

  const directionOf = (node: NodeEntry): Direction[] => {
    const position = positionOf(node, directions);
    if (position) return [position];

    let merged: Direction[] = [];
    for (let current: NodeEntry | null = node; current; current = current.parent) {
      merged = mergeDirections(merged, usage.get(diffNodeOf.get(current)!) ?? []);
    }
    return merged;
  };

  let widened = true;
  while (widened) {
    widened = false;
    for (const { from, to } of references) {
      const target = diffNodeOf.get(to)!;
      const current = usage.get(target) ?? [];
      const merged = mergeDirections(current, directionOf(from));
      if (merged.length !== current.length) {
        usage.set(target, merged);
        widened = true;
      }
    }
  }

  return directionOf;
}

function positionOf(node: NodeEntry, directions: Directions): Direction | undefined {
  for (let current: NodeEntry | null = node; current; current = current.parent) {
    const rule = directions[current.type];
    const direction = typeof rule === 'function' ? rule(current) : rule;
    if (direction) return direction;
  }
  return undefined;
}
