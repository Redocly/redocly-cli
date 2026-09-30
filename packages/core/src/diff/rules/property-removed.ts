import type { DiffRule } from '../types.js';
import { nameOf, ofSchema } from './utils.js';

// A member of a `properties` map; an alternative of a `oneOf` is a schema too, but not a property.
// Removing every property lands as one change on the `properties` map of the schema.
export const PropertyRemoved: DiffRule = () => ({
  SchemaProperties: {
    Schema(change, { report, directions }) {
      if (change.kind === 'removed' && directions.includes('response')) {
        report({
          message: `Property \`${nameOf(change.node)}\`${ofSchema(change.node.parent?.parent)} was removed.`,
        });
      }
    },
  },
  Schema: {
    SchemaProperties(change, { report, directions }) {
      if (change.kind === 'removed' && directions.includes('response')) {
        report({ message: `All properties${ofSchema(change.node.parent)} were removed.` });
      }
    },
  },
});
