import type { SpecVersion } from '../oas-types.js';
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
  const refSites: Array<{ from: NodeEntry; to: string }> = [];

  const visitor = {
    any(node: unknown, { location, type, key }: UserContext) {
      if (!isPlainObject(node) && !Array.isArray(node)) return;
      const parent = nodes.get(parentPointer(location.pointer)) ?? null;
      const entry: NodeEntry = {
        type: type.name,
        key,
        location,
        value: node,
        parent,
        children: [],
      };
      parent?.children.push(entry);
      nodes.set(location.pointer, entry);
    },
    ref(node: { $ref: string }, { location }: UserContext) {
      // The node holding the reference has been entered already; its target may come later.
      const from = nodes.get(parentPointer(location.pointer));
      if (from) refSites.push({ from, to: node.$ref });
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

  const references = refSites.flatMap(({ from, to }) => {
    const target = nodes.get(to);
    return target ? [{ from, to: target }] : [];
  });

  return { root: nodes.get('#/')!, references };
}

function parentPointer(pointer: string): string {
  const lastSlash = pointer.lastIndexOf('/');
  return lastSlash <= 1 ? '#/' : pointer.slice(0, lastSlash);
}
