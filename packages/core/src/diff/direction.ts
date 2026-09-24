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
 * the node takes the directions its referenced ancestors are used in, over both documents, so a
 * shared component keeps one direction.
 */
export function resolveDirections(
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

  // A site inside a referenced node borrows that node's usage, so each time a usage widens, the
  // references made from inside it are taken again. Usage only ever widens, so this ends, and a
  // reference cycle simply contributes nothing.
  const madeInside = new Map<DiffNode, Reference[]>();
  for (const reference of references) {
    for (let current: NodeEntry | null = reference.from; current; current = current.parent) {
      const node = diffNodeOf.get(current)!;
      const made = madeInside.get(node);
      if (made) made.push(reference);
      else madeInside.set(node, [reference]);
    }
  }

  const pending = [...references];
  while (pending.length) {
    const { from, to } = pending.pop()!;
    const target = diffNodeOf.get(to)!;
    const known = usage.get(target) ?? [];
    const widened = mergeDirections(known, directionOf(from));
    if (widened.length === known.length) continue;

    usage.set(target, widened);
    for (const reference of madeInside.get(target) ?? []) pending.push(reference);
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
