import { nameOf } from '../diff-node.js';
import type { DiffRule } from '../types.js';
import { ofNamedSchema } from './utils.js';

export const PropertyRemoved: DiffRule = () => ({
  SchemaProperties: {
    Schema(change, { report, getDirections }) {
      if (!getDirections().includes('response')) return;

      const owner = ofNamedSchema(change.node.parent?.parent);

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
      if (change.kind === 'removed' && getDirections().includes('response')) {
        report({ message: `All properties${ofNamedSchema(change.node.parent)} were removed.` });
      }
    },
  },
});
