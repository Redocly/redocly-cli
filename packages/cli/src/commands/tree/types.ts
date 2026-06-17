export type TreeFormat = 'stylish' | 'json' | 'mermaid';

export type NodeKind = 'root' | 'path' | 'operation' | 'component' | 'file';

export type GraphNode = {
  id: string;
  root?: boolean;
  external?: boolean;
  /** False: the file is referenced but could not be loaded. */
  resolved: boolean;
  /** Node category in the structure view; absent in --files mode. */
  kind?: NodeKind;
  /** Cwd-relative source file the node is defined in; absent in --files mode. */
  file?: string;
};

export type GraphEdge = {
  from: string;
  to: string;
  /** Distinct $ref strings used from `from` to `to`, sorted. */
  refs: string[];
};

export type DependencyGraph = {
  roots: string[];
  nodes: GraphNode[];
  edges: GraphEdge[];
};
