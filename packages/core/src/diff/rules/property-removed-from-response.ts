import type { DiffRule } from '../types.js';

// A member of a `properties` map; an alternative of a `oneOf` is a schema too, but not a property.
export const PropertyRemovedFromResponse: DiffRule = () => ({
  SchemaProperties: {
    Schema(change, { report, directions }) {
      if (change.kind === 'removed' && directions.includes('response')) {
        report({ message: 'Schema property was removed.' });
      }
    },
  },
});
