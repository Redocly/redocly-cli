import type { SpecVersion } from '../oas-types.js';
import { escapePointerFragment, joinPointer, parseRef } from '../ref-utils.js';
import type { Document } from '../resolve.js';
import type { NormalizedNodeType } from '../types/index.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import { normalizeVisitors } from '../visitors.js';
import { walkDocument, type UserContext, type WalkContext } from '../walk.js';
import type { NodeEntry, Reference } from './types.js';

export type NodeTree = { root: NodeEntry; references: Reference[] };

export function buildNodeTree(opts: {
  document: Document;
  types: Record<string, NormalizedNodeType>;
  specVersion: SpecVersion;
}): NodeTree {
  const { document, types, specVersion } = opts;
  const nodes = new Map<string, NodeEntry>();
  const refs: Array<{ entry: NodeEntry; ref: string }> = [];

  const add = (value: NodeEntry['value'], { location, type, key }: UserContext): NodeEntry => {
    const parent = nodes.get(parentPointer(location.pointer)) ?? null;
    const entry: NodeEntry = { type: type.name, key, location, value, parent, children: [] };
    parent?.children.push(entry);
    nodes.set(location.pointer, entry);
    return entry;
  };

  const visitor = {
    any(node: unknown, context: UserContext) {
      if (isPlainObject(node) || Array.isArray(node)) add(node, context);
    },
    // A `$ref` is a node of the type its place expects; the node it points at may come later.
    ref(node: { $ref: string }, context: UserContext) {
      refs.push({ entry: add(node, context), ref: node.$ref });
    },
  };

  const walkContext: WalkContext = { problems: [], specVersion, visitorsData: {} };

  walkDocument({
    document,
    rootType: types.Root,
    normalizedVisitors: normalizeVisitors(
      [{ severity: 'warn', ruleId: 'node-tree', visitor }],
      types
    ),
    // An empty map leaves every `$ref` unresolved, so each node is visited once, where it is written.
    resolvedRefMap: new Map(),
    ctx: walkContext,
  });

  const references: Reference[] = [];
  for (const { entry, ref } of refs) {
    entry.target = nodes.get(pointerOf(ref));
    if (entry.target) references.push({ from: entry, to: entry.target });
  }

  return { root: nodes.get('#/')!, references };
}

// A `$ref` may percent-encode its pointer (`Pet%20Name`), while a location spells it as written.
function pointerOf(ref: string): string {
  return parseRef(ref).pointer.reduce(
    (pointer, segment) => joinPointer(pointer, escapePointerFragment(segment)),
    '#/'
  );
}

function parentPointer(pointer: string): string {
  const lastSlash = pointer.lastIndexOf('/');
  return lastSlash <= 1 ? '#/' : pointer.slice(0, lastSlash);
}
