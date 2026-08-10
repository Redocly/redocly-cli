import { dequal } from '@redocly/openapi-core';

import type { NodeEntry, RawChange } from './types.js';

function removalOf(pointer: string, entry: NodeEntry): RawChange {
  return {
    pointer,
    kind: 'removed',
    typeName: entry.typeName,
    base: { pointer: entry.realPointer, value: entry.raw },
  };
}

function additionOf(pointer: string, entry: NodeEntry): RawChange {
  return {
    pointer,
    kind: 'added',
    typeName: entry.typeName,
    revision: { pointer: entry.realPointer, value: entry.raw },
  };
}

export function compareMaps(
  base: Map<string, NodeEntry>,
  revision: Map<string, NodeEntry>
): RawChange[] {
  const changes: RawChange[] = [];
  const keys = new Set([...base.keys(), ...revision.keys()]);

  // Pass 1: boundary nodes — added roots, removed roots, replaced (typeName differs).
  const boundaries = new Set<string>();
  for (const key of keys) {
    const baseEntry = base.get(key);
    const revisionEntry = revision.get(key);
    if (!baseEntry || !revisionEntry || baseEntry.typeName !== revisionEntry.typeName) {
      boundaries.add(key);
    }
  }

  const getEntry = (key: string) => base.get(key) ?? revision.get(key);

  const hasBoundaryAncestor = (key: string): boolean => {
    let parent = getEntry(key)?.parentPointer ?? null;
    while (parent !== null) {
      if (boundaries.has(parent)) return true;
      parent = getEntry(parent)?.parentPointer ?? null;
    }
    return false;
  };

  // Pass 2: emission, in deterministic pointer order.
  for (const key of [...keys].sort()) {
    if (hasBoundaryAncestor(key)) continue; // implied by a reported ancestor
    const baseEntry = base.get(key);
    const revisionEntry = revision.get(key);

    if (!baseEntry || !revisionEntry) {
      // Present on one side only, so the whole node was added or removed.
      if (baseEntry) changes.push(removalOf(key, baseEntry));
      if (revisionEntry) changes.push(additionOf(key, revisionEntry));
    } else if (baseEntry.typeName !== revisionEntry.typeName) {
      // replaced → a removed+added pair at the same pointer
      changes.push(removalOf(key, baseEntry), additionOf(key, revisionEntry));
    } else {
      const properties = new Set([
        ...Object.keys(baseEntry.scalars),
        ...Object.keys(baseEntry.refs),
        ...Object.keys(revisionEntry.scalars),
        ...Object.keys(revisionEntry.refs),
      ]);
      for (const property of [...properties].sort()) {
        const before =
          property in baseEntry.refs ? baseEntry.refs[property] : baseEntry.scalars[property];
        const after =
          property in revisionEntry.refs
            ? revisionEntry.refs[property]
            : revisionEntry.scalars[property];
        if (!dequal(before, after)) {
          changes.push({
            pointer: key,
            property,
            kind: 'changed',
            typeName: baseEntry.typeName,
            base: { pointer: `${baseEntry.realPointer}/${property}`, value: before },
            revision: { pointer: `${revisionEntry.realPointer}/${property}`, value: after },
          });
        }
      }
    }
  }

  return changes;
}
