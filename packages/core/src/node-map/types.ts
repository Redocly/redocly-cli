import type { Location } from '../ref-utils.js';

export type NodeValue = Record<string, unknown> | unknown[];

export interface NodeEntry {
  type: string;
  key: string | number;
  location: Location;
  value: NodeValue;
  parent: NodeEntry | null;
  children: NodeEntry[];
}

export interface Reference {
  from: NodeEntry;
  to: NodeEntry;
}
