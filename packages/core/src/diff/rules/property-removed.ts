import { fieldOf } from '../../node-tree/access.js';
import { nameOf } from '../diff-node.js';
import type { DiffNode, DiffRule, Direction } from '../types.js';
import { ofNamedSchema } from './utils.js';

export const PropertyRemoved: DiffRule = () => ({
  SchemaProperties: {
    Schema(change, { report, getDirections }) {
      const objectSchema = change.node.parent?.parent;
      const directions = getDirections();

      if (!removalBreaksClients(objectSchema, directions)) return;

      const owner = ofNamedSchema(objectSchema);

      if (change.kind === 'removed') {
        report({ message: `Property \`${nameOf(change.node)}\`${owner} was removed.` });
      }
      if (change.kind === 'modified' && change.property === 'key') {
        const { value: before } = change.base;
        const { value: after } = change.revision;
        report({ message: `Property \`${before}\`${owner} was renamed to \`${after}\`.` });
      }
    },
  },
  Schema: {
    SchemaProperties(change, { report, getDirections }) {
      const objectSchema = change.node.parent;
      const directions = getDirections();

      if (change.kind === 'removed' && removalBreaksClients(objectSchema, directions)) {
        report({ message: `All properties${ofNamedSchema(objectSchema)} were removed.` });
      }
    },
  },
});

function removalBreaksClients(
  objectSchema: DiffNode | null | undefined,
  directions: Direction[]
): boolean {
  if (directions.includes('response')) return true;
  if (!directions.includes('request')) return false;

  return (
    fieldOf(objectSchema?.revision, 'additionalProperties') === false ||
    fieldOf(objectSchema?.revision, 'unevaluatedProperties') === false
  );
}
