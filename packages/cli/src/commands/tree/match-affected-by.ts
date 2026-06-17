import { slash } from '@redocly/openapi-core';
import * as path from 'node:path';

import { mapRootPointer } from './node-id.js';
import type { DependencyGraph } from './types.js';

export type AffectedByMatch = {
  changedIds: string[];
  markerIds: string[];
  notes: string[];
  warnings: string[];
};

export function matchAffectedBy(
  graph: DependencyGraph,
  inputs: string[],
  options: { cwd: string; rootId: string }
): AffectedByMatch {
  const { cwd, rootId } = options;
  const nodeIds = new Set(graph.nodes.map((n) => n.id));

  const changedSet = new Set<string>();
  const markerSet = new Set<string>();
  const notes: string[] = [];
  const warnings: string[] = [];

  function addIds(ids: string[]): void {
    for (const id of ids) {
      changedSet.add(id);
      markerSet.add(id);
    }
  }

  for (const input of inputs) {
    const rel = slash(path.relative(cwd, path.resolve(cwd, input)));

    // Exact id wins — unless the input is the root file itself, which must fall through to the
    // whole-tree branch below rather than matching only the root node.
    if (nodeIds.has(input) && rel !== rootId) {
      addIds([input]);
      continue;
    }

    if (input.startsWith('#')) {
      const mapped = mapRootPointer(input, rootId);
      if (nodeIds.has(mapped.id)) {
        addIds([mapped.id]);
        continue;
      }
    }

    if (rel === rootId) {
      for (const node of graph.nodes) {
        changedSet.add(node.id);
      }
      markerSet.add(rootId);
      notes.push(`${rootId} is the root document — the whole tree is affected.`);
      continue;
    }
    const fileMatches = graph.nodes.filter((n) => n.file === rel).map((n) => n.id);
    if (fileMatches.length > 0) {
      addIds(fileMatches);
      continue;
    }

    if (!input.includes('/') && !input.includes('#')) {
      const componentMatches = graph.nodes
        .filter((n) => n.kind === 'component')
        .filter((n) => n.id.split('/').at(-1) === input)
        .map((n) => n.id);
      if (componentMatches.length > 0) {
        addIds(componentMatches);
        if (componentMatches.length > 1) {
          notes.push(
            `"${input}" matches multiple components: ${componentMatches.join(', ')} — including all of them.`
          );
        }
        continue;
      }
    }

    warnings.push(`${input} does not match any path, operation, or component of ${rootId}.`);
  }

  return {
    changedIds: Array.from(changedSet),
    markerIds: Array.from(markerSet),
    notes,
    warnings,
  };
}
