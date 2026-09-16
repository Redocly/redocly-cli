export interface NodeEntry {
  pointer: string; // stable matching key, e.g. '#/paths/~1pets/get/parameters/{query:limit}'
  realPointer: string; // actual JSON Pointer in THIS document, e.g. '#/paths/~1pets/get/parameters/1'
  parentPointer: string | null; // stable pointer of the parent node
  keyInParent: string | number; // the walker's own key, e.g. 'oneOf' for a combinator list
  typeName: string; // from this side's type tree
  scalars: Record<string, unknown>; // shallow primitives and arrays of primitives (enum, required, ...)
  refs: Record<string, string>; // $ref-valued properties, recorded as attributes (not followed)
  raw: unknown; // the raw node value — payload for added/removed changes
}

export interface UsageEdge {
  site: string;
  target: string;
}

export interface NodeMap {
  entries: Map<string, NodeEntry>;
  usageEdges: UsageEdge[];
}
