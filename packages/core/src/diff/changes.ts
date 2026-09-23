import type { NodeEntry } from '../node-map/types.js';
import { isRef } from '../ref-utils.js';
import { dequal } from '../utils/dequal.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import { isScalar, isScalarArray } from '../utils/is-scalar.js';
import { labelOf, nodeOf, typeOf } from './pairs.js';
import type { Change, DiffSpec, LocatedNode, Pair } from './types.js';

export function displaySide(change: Change): LocatedNode {
  return change.kind === 'removed' ? change.base : change.revision;
}

/** Every change under the root; nothing under a node that was added or removed as a whole. */
export function changesIn(root: Pair, spec: DiffSpec): Change[] {
  const changes: Change[] = [];
  const visit = (pair: Pair) => {
    changes.push(...changesOf(pair, spec));
    if (pair.base && pair.revision) pair.children.forEach(visit);
  };
  visit(root);
  return changes;
}

export function changesOf(pair: Pair, spec: DiffSpec): Change[] {
  const { base, revision } = pair;
  const key = labelOf(pair, spec);
  if (!base) return [{ key, pair, kind: 'added', revision: located(nodeOf(pair)) }];
  if (!revision) return [{ key, pair, kind: 'removed', base: located(base) }];

  const before = comparableValues(pair, base, spec);
  const after = comparableValues(pair, revision, spec);
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .sort()
    .filter((property) => !dequal(before[property], after[property]))
    .map((property) => ({
      key,
      pair,
      kind: 'modified',
      property,
      base: locatedProperty(base, property, before[property]),
      revision: locatedProperty(revision, property, after[property]),
    }));
}

/**
 * The node's own values — scalars, scalar arrays and `$ref`s; nested objects and arrays are
 * pairs of their own. A value the segment hides, such as a path template, is compared too.
 */
function comparableValues(pair: Pair, node: NodeEntry, spec: DiffSpec): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  if (isPlainObject(node.value)) {
    for (const [name, item] of Object.entries(node.value)) {
      if (isRef(item) || isScalar(item) || isScalarArray(item)) values[name] = item;
    }
  }

  const identity = pair.parent && spec.identityOf(node, typeOf(pair.parent));
  return { ...values, ...identity?.values };
}

function located(node: NodeEntry): LocatedNode {
  return { location: node.location, value: node.value };
}

// A value the node does not carry as a property (the path template) is located at the node.
function locatedProperty(node: NodeEntry, property: string, value: unknown): LocatedNode {
  const isOwnProperty = isPlainObject(node.value) && property in node.value;
  return { location: isOwnProperty ? node.location.child([property]) : node.location, value };
}
