import { slash } from '@redocly/openapi-core';
import * as path from 'node:path';

import { mapRootPointer } from './node-id.js';
import type { DependencyGraph } from './types.js';

export type AffectedByMatch = {
  changedIds: string[];
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
  const notes: string[] = [];
  const warnings: string[] = [];

  for (const input of inputs) {
    const rel = slash(path.relative(cwd, path.resolve(cwd, input)));
    const pointer = input.startsWith('#') ? mapRootPointer(input, rootId) : undefined;

    // The root — as the root file path or the `#/` pointer — affects the whole tree. Seed just the
    // root id; `filterAffected` expands it to the full subtree.
    if (rel === rootId || pointer?.id === rootId) {
      changedSet.add(rootId);
      notes.push(`${rootId} is the root document — the whole tree is affected.`);
      continue;
    }

    // Exact node id (shorthand) wins, tolerating a `./`-relative spelling.
    const exactId = nodeIds.has(input) ? input : nodeIds.has(rel) ? rel : undefined;
    if (exactId) {
      changedSet.add(exactId);
      continue;
    }

    if (pointer && nodeIds.has(pointer.id)) {
      changedSet.add(pointer.id);
      continue;
    }
    const fileMatches = graph.nodes.filter((n) => n.file === rel).map((n) => n.id);
    if (fileMatches.length > 0) {
      for (const id of fileMatches) changedSet.add(id);
      continue;
    }

    if (!input.includes('/') && !input.includes('#')) {
      const componentMatches = graph.nodes
        .filter((n) => n.kind === 'component')
        .filter((n) => n.id.split('/').at(-1) === input)
        .map((n) => n.id);
      if (componentMatches.length > 0) {
        for (const id of componentMatches) changedSet.add(id);
        if (componentMatches.length > 1) {
          notes.push(
            `"${input}" matches multiple components: ${componentMatches.join(', ')} — including all of them.`
          );
        }
        continue;
      }
    }

    let warning = `${input} does not match any path, operation, or component of ${rootId}.`;
    if (/\.(ya?ml|json)$/i.test(input)) {
      warning += ' For file-level analysis, use `--files`.';
    }
    warnings.push(warning);
  }

  return {
    changedIds: Array.from(changedSet),
    notes,
    warnings,
  };
}
