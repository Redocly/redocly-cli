import type { Location } from '../ref-utils.js';

export type NodeValue = Record<string, unknown> | unknown[];

export type NodeEntry = {
  type: string;
  key: string | number;
  location: Location;
  value: NodeValue;
  parent: NodeEntry | null;
  children: NodeEntry[];
  /** For a `$ref`, the node it points at; absent when it does not resolve. */
  target?: NodeEntry;
};

export type Reference = { from: NodeEntry; to: NodeEntry };
