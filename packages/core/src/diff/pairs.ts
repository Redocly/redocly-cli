import type { NodeEntry } from '../node-map/types.js';
import { escapePointerFragment, joinPointer } from '../ref-utils.js';
import type { DiffSpec, Pair } from './types.js';

export function nodeOf(pair: Pair): NodeEntry {
  return (pair.revision ?? pair.base)!;
}

export function typeOf(pair: Pair): string {
  return nodeOf(pair).type;
}

/**
 * Matches the two documents up top-down: the roots are a pair, and the children of a pair are
 * matched by the segment their container gives them. Every node gets a pair, including those
 * under a node that exists on one side only, so a reference site is always addressable.
 */
export function pairDocuments(
  base: NodeEntry,
  revision: NodeEntry,
  spec: DiffSpec
): { root: Pair; pairOf: Map<NodeEntry, Pair> } {
  const pairOf = new Map<NodeEntry, Pair>();

  function pairUp(
    baseNode: NodeEntry | undefined,
    revisionNode: NodeEntry | undefined,
    parent: Pair | null,
    occurrence: number
  ): Pair {
    const pair: Pair = { base: baseNode, revision: revisionNode, parent, children: [], occurrence };
    if (baseNode) pairOf.set(baseNode, pair);
    if (revisionNode) pairOf.set(revisionNode, pair);

    const container = typeOf(pair);
    const baseChildren = groupBySegment(baseNode?.children ?? [], container, spec);
    const revisionChildren = groupBySegment(revisionNode?.children ?? [], container, spec);

    for (const segment of new Set([...baseChildren.keys(), ...revisionChildren.keys()])) {
      const left = baseChildren.get(segment) ?? [];
      const right = revisionChildren.get(segment) ?? [];
      for (let index = 0; index < Math.max(left.length, right.length); index++) {
        if (left[index] && right[index] && left[index].type !== right[index].type) {
          // The same place holds a different kind of node: a removal and an addition.
          pair.children.push(pairUp(left[index], undefined, pair, index + 1));
          pair.children.push(pairUp(undefined, right[index], pair, index + 1));
        } else {
          pair.children.push(pairUp(left[index], right[index], pair, index + 1));
        }
      }
    }

    return pair;
  }

  return { root: pairUp(base, revision, null, 1), pairOf };
}

function groupBySegment(
  nodes: NodeEntry[],
  container: string,
  spec: DiffSpec
): Map<string, NodeEntry[]> {
  const groups = new Map<string, NodeEntry[]>();
  for (const node of nodes) {
    const segment = segmentOf(node, container, spec);
    groups.set(segment, [...(groups.get(segment) ?? []), node]);
  }
  return groups;
}

function segmentOf(node: NodeEntry, container: string, spec: DiffSpec): string {
  return spec.identityOf(node, container)?.segment ?? escapePointerFragment(String(node.key));
}

/** The report key: the pair's segments joined like a pointer, `#n` marking the n-th sibling with the same segment. */
export function labelOf(pair: Pair, spec: DiffSpec): string {
  if (!pair.parent) return '#/';
  const own = joinPointer(
    labelOf(pair.parent, spec),
    segmentOf(nodeOf(pair), typeOf(pair.parent), spec)
  );
  return pair.occurrence === 1 ? own : `${own}#${pair.occurrence}`;
}
