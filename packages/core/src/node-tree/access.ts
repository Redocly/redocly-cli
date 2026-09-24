import { isPlainObject } from '../utils/is-plain-object.js';
import type { NodeEntry } from './types.js';

/** The nearest node of that type, the node itself included. */
export function enclosing(node: NodeEntry | null, type: string): NodeEntry | undefined {
  for (let current = node; current; current = current.parent) {
    if (current.type === type) return current;
  }
  return undefined;
}

/** What the node stands for: a `$ref` stands for the node it points at. */
export function valueOf(node: NodeEntry): NodeEntry['value'] {
  return node.target?.value ?? node.value;
}

export function fieldOf(node: NodeEntry | undefined, name: string): unknown {
  const value = node && valueOf(node);
  return isPlainObject(value) ? value[name] : undefined;
}
