import type { DiffRule } from '../types.js';

export const ParameterBecameRequired: DiffRule = () => ({
  Parameter(change, { report, directions }) {
    if (change.kind !== 'modified' || change.property !== 'required') return;
    if (directions.includes('request') && change.revision.value === true) {
      report({ message: 'Parameter became required.' });
    }
  },
});
