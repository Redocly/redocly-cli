export type GraphFormat = 'stylish' | 'json' | 'mermaid';

export type GraphNode = {
  /** Path relative to cwd; http(s) refs keep the full URL. */
  id: string;
  /** Entry-point API file. */
  root?: boolean;
  /** Node is an http(s) URL, not a local file. */
  external?: boolean;
  /** False: the file is referenced but could not be loaded. */
  resolved: boolean;
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
