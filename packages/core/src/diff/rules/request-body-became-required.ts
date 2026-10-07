import type { DiffRule } from '../types.js';

export const RequestBodyBecameRequired: DiffRule = () => ({
  RequestBody(change, { report, getDirections }) {
    if (change.kind !== 'modified' || change.property !== 'required') return;
    if (getDirections().includes('request') && change.revision.value === true) {
      report({ message: 'Request body became required.' });
    }
  },
});
