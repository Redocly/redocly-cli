import type { Location } from '../ref-utils.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import type { NodeEntry, NodeValue } from './types.js';

/** The nearest node of that type, the node itself included. */
export function enclosing(node: NodeEntry, typeName: string): NodeEntry | undefined {
  // A `$ref` inside a file can lead back to the file's root, so each node is climbed once.
  const climbed = new Set<NodeEntry>();
  let current: NodeEntry | undefined = node;

  while (current && !climbed.has(current)) {
    if (current.type.name === typeName) return current;
    climbed.add(current);
    current = current.parent ?? current.referencedFrom;
  }

  return undefined;
}

// A `$ref` stands for the node it points at.
export function valueOf(node: NodeEntry): NodeValue {
  return (node.resolved ?? node).value;
}

export function locationOf(node: NodeEntry): Location {
  return (node.resolved ?? node).location;
}

export function fieldOf(node: NodeEntry | undefined, name: string): unknown {
  const value = node && valueOf(node);
  return isPlainObject(value) ? value[name] : undefined;
}

export function keyKindOf(node: NodeEntry): 'field' | 'entry' | 'item' {
  if (typeof node.key === 'number') return 'item';

  const isField = !!node.parent && Object.hasOwn(node.parent.type.properties, node.key);
  return isField ? 'field' : 'entry';
}
