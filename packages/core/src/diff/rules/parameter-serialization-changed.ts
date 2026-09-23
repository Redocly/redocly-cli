import type { DiffRule } from '../types.js';

// How a value is put on the wire is part of the contract: a client that encoded
// the old way is not understood after the change.
const SERIALIZATION = new Set(['style', 'explode', 'allowReserved', 'allowEmptyValue']);

export const ParameterSerializationChanged: DiffRule = () => ({
  Parameter(change, { report, directions }) {
    if (change.kind !== 'modified' || !SERIALIZATION.has(change.property)) return;
    if (!directions.includes('request')) return;
    report({
      message: `Parameter \`${change.property}\` changed from '${change.base.value}' to '${change.revision.value}'.`,
    });
  },
});
