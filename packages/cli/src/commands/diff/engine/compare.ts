import { scalarEquals } from './predicates.js';
import type { NodeEntry, RawChange } from './types.js';

export function compareMaps(
  base: Map<string, NodeEntry>,
  revision: Map<string, NodeEntry>
): RawChange[] {
  const changes: RawChange[] = [];
  const keys = new Set([...base.keys(), ...revision.keys()]);

  // Pass 1: boundary nodes — added roots, removed roots, replaced (typeName differs).
  const boundaries = new Set<string>();
  for (const key of keys) {
    const a = base.get(key);
    const b = revision.get(key);
    if (!a || !b || a.typeName !== b.typeName) {
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
    const a = base.get(key);
    const b = revision.get(key);

    if (a && !b) {
      changes.push({
        pointer: key,
        kind: 'removed',
        typeName: a.typeName,
        base: { pointer: a.realPointer, value: a.raw },
      });
    } else if (!a && b) {
      changes.push({
        pointer: key,
        kind: 'added',
        typeName: b.typeName,
        revision: { pointer: b.realPointer, value: b.raw },
      });
    } else if (a && b && a.typeName !== b.typeName) {
      // replaced → a removed+added pair at the same pointer
      changes.push({
        pointer: key,
        kind: 'removed',
        typeName: a.typeName,
        base: { pointer: a.realPointer, value: a.raw },
      });
      changes.push({
        pointer: key,
        kind: 'added',
        typeName: b.typeName,
        revision: { pointer: b.realPointer, value: b.raw },
      });
    } else if (a && b) {
      const props = new Set([
        ...Object.keys(a.scalars),
        ...Object.keys(a.refs),
        ...Object.keys(b.scalars),
        ...Object.keys(b.refs),
      ]);
      for (const property of [...props].sort()) {
        const before = property in a.refs ? a.refs[property] : a.scalars[property];
        const after = property in b.refs ? b.refs[property] : b.scalars[property];
        if (!scalarEquals(before, after)) {
          changes.push({
            pointer: key,
            property,
            kind: 'changed',
            typeName: a.typeName,
            base: { pointer: `${a.realPointer}/${property}`, value: before },
            revision: { pointer: `${b.realPointer}/${property}`, value: after },
          });
        }
      }
    }
  }

  return changes;
}
