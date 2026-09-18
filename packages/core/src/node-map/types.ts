import type { Location } from '../ref-utils.js';

export interface NodeEntry {
  /** Stable matching key, the same for the same logical node on both sides; also the map key. */
  key: string;
  parentKey: string | null;
  /** Where the node really is: source and JSON Pointer, as the walker reports it. */
  location: Location;
  typeName: string;
  /** The node's own comparable values — scalars, scalar arrays, `$ref`s — verbatim. Nested objects are nodes of their own. */
  properties: Record<string, unknown>;
  /** The whole node, children included — the payload of an added or removed change. */
  raw: unknown;
}

export interface UsageEdge {
  /** The key of the node holding the `$ref`. */
  site: string;
  /** The `$ref` string, which for a component is also its key. */
  target: string;
}

export interface NodeMap {
  entries: Map<string, NodeEntry>;
  usageEdges: UsageEdge[];
}

export interface IdentityContext {
  typeName: string;
  /** The walker's own key: an index in a list, a property name in a map. */
  key: string | number;
  parent: unknown;
  /** The ancestors already collected, root first — the walk is pre-order. */
  ancestors: NodeEntry[];
}

export interface NodeIdentity {
  /** Replaces the walker's key as the last segment of the node's key. */
  segment: string;
  /** What the key used to say and compare should still see — the path template, for one. */
  properties?: Record<string, unknown>;
}

export type IdentityFn = (
  node: Record<string, unknown>,
  context: IdentityContext
) => NodeIdentity | undefined;
