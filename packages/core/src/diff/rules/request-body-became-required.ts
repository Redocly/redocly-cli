import type { DiffRule } from '../types.js';

export const RequestBodyBecameRequired: DiffRule = () => ({
  RequestBody(change, { report, directions }) {
    if (change.kind !== 'modified' || change.property !== 'required') return;
    if (directions.includes('request') && change.revision.value === true) {
      report({ message: 'Request body became required.' });
    }
  },
});
