import type { Location } from '../ref-utils.js';
import type { NormalizedNodeType } from '../types/index.js';

export type NodeValue = Record<string, unknown> | unknown[];

export type NodeEntry = {
  type: NormalizedNodeType;
  /** The root of another file takes the key of the `$ref` that reaches it. */
  key: string | number;
  location: Location;
  value: NodeValue;
  parent: NodeEntry | null;
  children: NodeEntry[];
  /** The target of a `$ref`. */
  resolved?: NodeEntry;
  /** For a node with no parent, such as the root of another file: the `$ref` it was reached by. */
  referencedFrom?: NodeEntry;
};
