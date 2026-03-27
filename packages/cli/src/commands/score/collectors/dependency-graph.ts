import type { OperationMetrics } from '../types.js';

/**
 * Builds a dependency graph from shared $ref usage across operations.
 * An edge from A to B means both A and B reference the same schema $ref.
 * The depth for each operation is the longest path from a root node (no incoming edges)
 * in the undirected "shared ref" graph.
 */
export function computeDependencyDepths(
  operations: Map<string, OperationMetrics>
): Map<string, number> {
  const refToOps = new Map<string, Set<string>>();

  for (const [opKey, metrics] of operations) {
    for (const ref of metrics.refsUsed) {
      let ops = refToOps.get(ref);
      if (!ops) {
        ops = new Set();
        refToOps.set(ref, ops);
      }
      ops.add(opKey);
    }
  }

  const adjacency = new Map<string, Set<string>>();
  for (const opKey of operations.keys()) {
    adjacency.set(opKey, new Set());
  }

  for (const ops of refToOps.values()) {
    if (ops.size < 2) continue;
    const opArray = Array.from(ops);
    for (let i = 0; i < opArray.length; i++) {
      for (let j = i + 1; j < opArray.length; j++) {
        adjacency.get(opArray[i])!.add(opArray[j]);
        adjacency.get(opArray[j])!.add(opArray[i]);
      }
    }
  }

  const depths = new Map<string, number>();

  for (const opKey of operations.keys()) {
    const depth = bfsMaxDepth(opKey, adjacency);
    depths.set(opKey, depth);
  }

  return depths;
}

function bfsMaxDepth(start: string, adjacency: Map<string, Set<string>>): number {
  const visited = new Set<string>([start]);
  let queue = [start];
  let depth = 0;

  while (queue.length > 0) {
    const next: string[] = [];
    for (const node of queue) {
      for (const neighbor of adjacency.get(node) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          next.push(neighbor);
        }
      }
    }
    if (next.length > 0) depth++;
    queue = next;
  }

  return depth;
}
