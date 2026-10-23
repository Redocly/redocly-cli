import { valueOf } from '../node-tree/access.js';
import type { NodeEntry } from '../node-tree/types.js';
import { dequal } from '../utils/dequal.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import { isScalar, isScalarArray } from '../utils/is-scalar.js';
import { comparedSidesOf, latestOf, pointerOf } from './diff-node.js';
import type { Change, DiffNode, LocatedNode } from './types.js';

export function displaySide(change: Change): LocatedNode {
  return change.kind === 'removed' ? change.base : change.revision;
}

export function changesOf(node: DiffNode): Change[] {
  const { base, revision } = comparedSidesOf(node);

  if (!base) {
    return [{ key: pointerOf(node), node, kind: 'added', revision: located(latestOf(node)) }];
  }
  if (!revision) {
    return [{ key: pointerOf(node), node, kind: 'removed', base: located(base) }];
  }

  const changes: Change[] = [];
  let key: string | undefined;

  const before = comparableValues(base);
  const after = comparableValues(revision);

  for (const property of Object.keys({ ...before, ...after })) {
    if (dequal(before[property], after[property])) continue;

    key ??= pointerOf(node);
    changes.push({
      key,
      node,
      kind: 'modified',
      property,
      base: locatedProperty(base, property, before[property]),
      revision: locatedProperty(revision, property, after[property]),
    });
  }

  return changes;
}

function comparableValues(side: NodeEntry): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  const childKeys = new Set(side.children.map((child) => child.key));

  if (isPlainObject(side.value)) {
    for (const [name, item] of Object.entries(side.value)) {
      // Children and the targets of `$ref`s are compared as pairs of their own.
      if (childKeys.has(name) || (name === '$ref' && side.resolved)) continue;
      if (isScalar(item) || isScalarArray(item)) values[name] = item;
    }
  }

  return values;
}

function located(side: NodeEntry): LocatedNode {
  return { location: side.location, value: valueOf(side) };
}

function locatedProperty(side: NodeEntry, property: string, value: unknown): LocatedNode {
  const isOwnProperty = isPlainObject(side.value) && property in side.value;
  return { location: isOwnProperty ? side.location.child([property]) : side.location, value };
}
