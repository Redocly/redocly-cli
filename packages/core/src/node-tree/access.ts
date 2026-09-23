import { isPlainObject } from '../utils/is-plain-object.js';
import type { NodeEntry } from './types.js';

/** The nearest node of that type, the node itself included. */
export function enclosing(node: NodeEntry | null, type: string): NodeEntry | undefined {
  for (let current = node; current; current = current.parent) {
    if (current.type === type) return current;
  }
  return undefined;
}

export function fieldOf(node: NodeEntry | undefined, name: string): unknown {
  return node && isPlainObject(node.value) ? node.value[name] : undefined;
}
