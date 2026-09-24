import type { NodeEntry } from '../node-tree/types.js';
import { dequal } from '../utils/dequal.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import { isScalar, isScalarArray } from '../utils/is-scalar.js';
import { identityOf, latestOf, typeOf } from './diff-tree.js';
import type { Change, DiffNode, Identities, LocatedNode } from './types.js';

export function displaySide(change: Change): LocatedNode {
  return change.kind === 'removed' ? change.base : change.revision;
}

/** Every change between the two documents; nothing below a node added or removed as a whole. */
export function collectChanges(root: DiffNode, identities: Identities): Change[] {
  const changes: Change[] = [];

  const visit = (node: DiffNode) => {
    const { key, base, revision } = node;
    if (!base) {
      changes.push({ key, node, kind: 'added', revision: located(latestOf(node)) });
      return;
    }
    if (!revision) {
      changes.push({ key, node, kind: 'removed', base: located(base) });
      return;
    }

    const before = comparableValues(node, base, identities);
    const after = comparableValues(node, revision, identities);

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

/**
 * The node's own values — scalars and scalar arrays; nested objects, arrays and `$ref`s are
 * nodes of their own. A value the segment hides, such as a path template, is compared too.
 */
function comparableValues(
  node: DiffNode,
  side: NodeEntry,
  identities: Identities
): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  if (isPlainObject(side.value)) {
    for (const [name, item] of Object.entries(side.value)) {
      if (isScalar(item) || isScalarArray(item)) values[name] = item;
    }
  }

  const identity = node.parent && identityOf(side, typeOf(node.parent), identities);
  return { ...values, ...identity?.values };
}

// A `$ref` added or removed stands for what it points at, so a rule reads the target's value.
function located(side: NodeEntry): LocatedNode {
  return { location: side.location, value: side.target?.value ?? side.value };
}

// A value the node does not carry as a property (the path template) is located at the node.
function locatedProperty(side: NodeEntry, property: string, value: unknown): LocatedNode {
  const isOwnProperty = isPlainObject(side.value) && property in side.value;
  return { location: isOwnProperty ? side.location.child([property]) : side.location, value };
}
