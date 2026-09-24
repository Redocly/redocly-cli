import type { NodeEntry } from '../node-tree/types.js';
import { escapePointerFragment, joinPointer } from '../ref-utils.js';
import type { DiffNode, Identities } from './types.js';

export function latestOf(node: DiffNode): NodeEntry {
  return (node.revision ?? node.base)!;
}

export function typeOf(node: DiffNode): string {
  return latestOf(node).type;
}

/**
 * Matches the two documents up top-down into one tree: the roots meet, and the children of a
 * node are matched by the segment their container gives them. Every node of either document gets
 * a place, including those under a node that exists on one side only, so a reference site is
 * always addressable.
 */
export function buildDiffTree(
  base: NodeEntry,
  revision: NodeEntry,
  identities: Identities
): { root: DiffNode; diffNodeOf: Map<NodeEntry, DiffNode> } {
  const diffNodeOf = new Map<NodeEntry, DiffNode>();

  function addNode(
    parent: DiffNode | null,
    label: string,
    sides: Pick<DiffNode, 'base' | 'revision'>
  ): DiffNode {
    const node: DiffNode = { ...sides, parent, children: [], label };
    parent?.children.push(node);
    if (node.base) diffNodeOf.set(node.base, node);
    if (node.revision) diffNodeOf.set(node.revision, node);

    const container = typeOf(node);
    const baseGroups = groupBySegment(node.base?.children ?? [], container, identities);
    const revisionGroups = groupBySegment(node.revision?.children ?? [], container, identities);

    for (const [segment, baseNodes] of baseGroups) {
      matchSiblings(node, segment, baseNodes, revisionGroups.get(segment) ?? []);
    }

    for (const [segment, revisionNodes] of revisionGroups) {
      if (!baseGroups.has(segment)) {
        matchSiblings(node, segment, [], revisionNodes);
      }
    }

    return node;
  }

  function matchSiblings(
    parent: DiffNode,
    segment: string,
    baseNodes: NodeEntry[],
    revisionNodes: NodeEntry[]
  ): void {
    const sharedLabel = joinPointer(parent.label, segment);
    for (let index = 0; index < Math.max(baseNodes.length, revisionNodes.length); index++) {
      const label = index === 0 ? sharedLabel : `${sharedLabel}#${index + 1}`;
      const base = baseNodes[index];
      const revision = revisionNodes[index];

      if (base && revision && base.type !== revision.type) {
        // A different kind of node in the same place is a removal and an addition.
        addNode(parent, label, { base });
        addNode(parent, label, { revision });
      } else {
        addNode(parent, label, { base, revision });
      }
    }
  }

  return { root: addNode(null, '#/', { base, revision }), diffNodeOf };
}

// A child the specification does not identify keeps its key. A list item has no name of its
// own: an inline one is known by its position, a `$ref` by the node it points at, so reordering
// references is not a change.
function segmentOf(child: NodeEntry, container: string, identities: Identities): string {
  const identity = identities[container]?.(child);
  if (identity) return identity;
  if (typeof child.key === 'number' && child.target) {
    return `{${escapePointerFragment(child.target.location.pointer)}}`;
  }
  return escapePointerFragment(String(child.key));
}

function groupBySegment(
  nodes: NodeEntry[],
  container: string,
  identities: Identities
): Map<string, NodeEntry[]> {
  const groups = new Map<string, NodeEntry[]>();

  for (const node of nodes) {
    const segment = segmentOf(node, container, identities);
    const group = groups.get(segment);

    if (group) {
      group.push(node);
    } else {
      groups.set(segment, [node]);
    }
  }

  return groups;
}
