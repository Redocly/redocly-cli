import { keyKindOf } from '../node-tree/access.js';
import type { NodeEntry } from '../node-tree/types.js';
import { escapePointerFragment, isRefWithSiblings, joinPointer } from '../ref-utils.js';
import type { DiffNode, Pair } from './types.js';

// A pair has at least one side.
export function latestOf(node: Pair): NodeEntry {
  return (node.revision ?? node.base)!;
}

export function typeOf(node: DiffNode): string {
  return latestOf(node).type.name;
}

// A field or a list item written as a `$ref` is named after its target: `schema` or `0` says less
// than `Order`. A map entry keeps its own key.
export function nameOf(node: DiffNode): string {
  const written = latestOf(node);
  const name =
    keyKindOf(written) === 'entry' ? written.key : (written.resolved?.key ?? written.key);
  return String(name);
}

export function hasKeysNextToRefs(sides: Pair): boolean {
  if (!sides.base?.resolved || !sides.revision?.resolved) return false;
  return isRefWithSiblings(sides.base.value) || isRefWithSiblings(sides.revision.value);
}

// A `$ref` stands for its target, unless both sides are `$ref`s and either has keys next to its
// `$ref` (OpenAPI 3.1): then the written keys are compared here, and the targets one level down.
export function comparedSidesOf(node: DiffNode): Pair {
  if (!node.base || !node.revision || hasKeysNextToRefs(node)) return node;

  return {
    base: node.base.resolved ?? node.base,
    revision: node.revision.resolved ?? node.revision,
  };
}

export function pointerOf(node: DiffNode): string {
  if (!node.parent) return '#/';

  const written = latestOf(node);
  const isRefTarget = written === latestOf(comparedSidesOf(node.parent)).resolved;
  const segment = isRefTarget ? '$ref' : escapePointerFragment(String(written.key));

  return joinPointer(pointerOf(node.parent), segment);
}
