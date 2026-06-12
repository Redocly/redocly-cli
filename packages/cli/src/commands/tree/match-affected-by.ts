import { slash } from '@redocly/openapi-core';
import * as path from 'node:path';

import { mapRootPointer } from './node-id.js';
import type { DependencyGraph } from './types.js';

export type AffectedByMatch = {
  /** Node ids to seed the reverse-closure filter with. */
  changedIds: string[];
  /** Node ids that get the `← changed` marker in stylish output. */
  markerIds: string[];
  /** Informational stderr notes (root-file expansion, ambiguous matches). */
  notes: string[];
  /** Stderr warnings for inputs that matched nothing. */
  warnings: string[];
};

/** Matches raw --affected-by inputs (node id, pointer, file path, or bare component name) against structure-graph nodes. */
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

  /** Appends ids to changedSet and markerSet, preserving first-seen order. */
  function addIds(ids: string[]): void {
    for (const id of ids) {
      changedSet.add(id);
      markerSet.add(id);
    }
  }

  for (const input of inputs) {
    // Pre-compute the cwd-relative path for every input; used in Rules 1 and 3.
    const rel = slash(path.relative(cwd, path.resolve(cwd, input)));

    // Rule 1: exact node id — but skip when the input also resolves to the root file,
    // so that passing the root filename triggers Rule 3's whole-tree expansion instead.
    if (nodeIds.has(input) && rel !== rootId) {
      addIds([input]);
      continue;
    }

    // Rule 2: pointer form
    if (input.startsWith('#')) {
      const mapped = mapRootPointer(input, rootId);
      if (nodeIds.has(mapped.id)) {
        addIds([mapped.id]);
        continue;
      }
    }

    // Rule 3: file path
    if (rel === rootId) {
      // Special: entire tree is affected
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

    // Rule 4: bare component name (no '/', no '#')
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

    // No rule matched
    warnings.push(`${input} does not match any path, operation, or component of ${rootId}.`);
  }

  return {
    changedIds: Array.from(changedSet),
    markerIds: Array.from(markerSet),
    notes,
    warnings,
  };
}
