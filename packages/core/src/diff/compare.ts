import type { NodeEntry } from '../node-map/types.js';
import { dequal } from '../utils/dequal.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import type { Change } from './types.js';

function removalOf(entry: NodeEntry): Change {
  return {
    key: entry.key,
    kind: 'removed',
    typeName: entry.typeName,
    base: { location: entry.location, value: entry.raw },
  };
}

function additionOf(entry: NodeEntry): Change {
  return {
    key: entry.key,
    kind: 'added',
    typeName: entry.typeName,
    revision: { location: entry.location, value: entry.raw },
  };
}

export function compareMaps(
  base: Map<string, NodeEntry>,
  revision: Map<string, NodeEntry>
): Change[] {
  const changes: Change[] = [];
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
    let parent = getEntry(key)?.parentKey ?? null;
    while (parent !== null) {
      if (boundaries.has(parent)) return true;
      parent = getEntry(parent)?.parentKey ?? null;
    }
    return false;
  };

  // Pass 2: emission, in deterministic key order.
  for (const key of [...keys].sort()) {
    if (hasBoundaryAncestor(key)) continue; // implied by a reported ancestor
    const baseEntry = base.get(key);
    const revisionEntry = revision.get(key);

    if (!baseEntry || !revisionEntry) {
      // Present on one side only, so the whole node was added or removed.
      if (baseEntry) changes.push(removalOf(baseEntry));
      if (revisionEntry) changes.push(additionOf(revisionEntry));
    } else if (baseEntry.typeName !== revisionEntry.typeName) {
      // replaced → a removed+added pair at the same key
      changes.push(removalOf(baseEntry), additionOf(revisionEntry));
    } else {
      const properties = new Set([
        ...Object.keys(baseEntry.properties),
        ...Object.keys(revisionEntry.properties),
      ]);
      for (const property of [...properties].sort()) {
        const before = baseEntry.properties[property];
        const after = revisionEntry.properties[property];
        if (dequal(before, after)) continue;
        changes.push({
          key,
          kind: 'modified',
          typeName: baseEntry.typeName,
          property,
          base: { location: propertyLocation(baseEntry, property), value: before },
          revision: { location: propertyLocation(revisionEntry, property), value: after },
        });
      }
    }
  }

  return changes;
}

function propertyLocation(entry: NodeEntry, property: string) {
  const isOwnProperty = isPlainObject(entry.raw) && property in entry.raw;
  return isOwnProperty ? entry.location.child([property]) : entry.location;
}
