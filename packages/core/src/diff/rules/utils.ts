import { fieldOf } from '../../node-tree/access.js';
import type { NodeEntry } from '../../node-tree/types.js';
import { comparedSidesOf, latestOf, nameOf, typeOf } from '../diff-node.js';
import type { DiffNode } from '../types.js';

/** `` of `Order` `` for a property or a component schema; nothing for an inline one. */
export function ofNamedSchema(schema: DiffNode | null | undefined): string {
  if (!schema) return '';

  const container = latestOf(comparedSidesOf(schema)).parent?.type.name;
  const isNamed = container === 'SchemaProperties' || container === 'NamedSchemas';
  return isNamed ? ` of \`${nameOf(schema)}\`` : '';
}

export function propertiesMarkedAs(schema: DiffNode, keyword: 'readOnly' | 'writeOnly'): string[] {
  const latestByName = new Map<string, NodeEntry>();
  const sides = comparedSidesOf(schema);

  for (const side of [sides.base, sides.revision]) {
    const properties = side?.children.find((child) => child.type.name === 'SchemaProperties');
    for (const property of properties?.children ?? []) {
      latestByName.set(String(property.key), property);
    }
  }

  return [...latestByName.keys()].filter(
    (name) => fieldOf(latestByName.get(name), keyword) === true
  );
}

// `components` has maps of the same types as the document; only the document's own count.
export function isRootField(node: DiffNode): boolean {
  return node.parent !== null && typeOf(node.parent) === 'Root';
}
