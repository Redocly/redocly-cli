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

  function addSubtree(node: DiffNode): DiffNode {
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
    const sharedKey = joinPointer(parent.key, segment);
    for (let index = 0; index < Math.max(baseNodes.length, revisionNodes.length); index++) {
      const key = index === 0 ? sharedKey : `${sharedKey}#${index + 1}`;

      const add = (sides: Pick<DiffNode, 'base' | 'revision'>) =>
        parent.children.push(addSubtree({ ...sides, parent, children: [], key }));

      const baseNode = baseNodes[index];
      const revisionNode = revisionNodes[index];
      const typeChanged = baseNode && revisionNode && baseNode.type !== revisionNode.type;
      if (typeChanged) {
        // A different kind of node in the same place is a removal and an addition.
        add({ base: baseNode });
        add({ revision: revisionNode });
      } else {
        add({ base: baseNode, revision: revisionNode });
      }
    }
  }

  return {
    root: addSubtree({ base, revision, parent: null, children: [], key: '#/' }),
    diffNodeOf,
  };
}

function groupBySegment(
  nodes: NodeEntry[],
  container: string,
  identities: Identities
): Map<string, NodeEntry[]> {
  const groups = new Map<string, NodeEntry[]>();

  for (const node of nodes) {
    const segment =
      identities[container]?.(node)?.segment ?? escapePointerFragment(String(node.key));
    const group = groups.get(segment);

    if (group) {
      group.push(node);
    } else {
      groups.set(segment, [node]);
    }
  }

  return groups;
}
