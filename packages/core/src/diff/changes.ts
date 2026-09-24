import { valueOf } from '../node-tree/access.js';
import type { NodeEntry } from '../node-tree/types.js';
import { dequal } from '../utils/dequal.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import { isScalar, isScalarArray } from '../utils/is-scalar.js';
import { latestOf } from './diff-tree.js';
import type { Change, DiffNode, LocatedNode } from './types.js';

export function displaySide(change: Change): LocatedNode {
  return change.kind === 'removed' ? change.base : change.revision;
}

/** Every change between the two documents; nothing below a node added or removed as a whole. */
export function collectChanges(root: DiffNode): Change[] {
  const changes: Change[] = [];

  const visit = (node: DiffNode) => {
    const { label: key, base, revision } = node;
    if (!base) {
      changes.push({ key, node, kind: 'added', revision: located(latestOf(node)) });
      return;
    }
    if (!revision) {
      changes.push({ key, node, kind: 'removed', base: located(base) });
      return;
    }

    // Map entries matched by an identity other than their key, such as paths of the same shape.
    if (typeof base.key === 'string' && base.key !== revision.key) {
      changes.push({
        key,
        node,
        kind: 'modified',
        property: 'key',
        base: { location: base.location, value: base.key },
        revision: { location: revision.location, value: revision.key },
      });
    }

    const before = comparableValues(base);
    const after = comparableValues(revision);

    for (const property of Object.keys({ ...before, ...after })) {
      if (dequal(before[property], after[property])) continue;

      changes.push({
        key,
        node,
        kind: 'modified',
        property,
        base: locatedProperty(base, property, before[property]),
        revision: locatedProperty(revision, property, after[property]),
      });
    }

    node.children.forEach(visit);
  };

  visit(root);

  return changes;
}

/** The node's own scalars and scalar arrays; nested objects, arrays and `$ref`s are nodes of their own. */
function comparableValues(side: NodeEntry): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  if (isPlainObject(side.value)) {
    for (const [name, item] of Object.entries(side.value)) {
      if (isScalar(item) || isScalarArray(item)) values[name] = item;
    }
  }

  return values;
}

// A `$ref` added or removed stands for what it points at, so a rule reads the target's value.
function located(side: NodeEntry): LocatedNode {
  return { location: side.location, value: valueOf(side) };
}

// A property one side does not have is located at the node itself.
function locatedProperty(side: NodeEntry, property: string, value: unknown): LocatedNode {
  const isOwnProperty = isPlainObject(side.value) && property in side.value;
  return { location: isOwnProperty ? side.location.child([property]) : side.location, value };
}
