import type { DiffRule } from '../types.js';

export const RequestBodyRemoved: DiffRule = () => ({
  RequestBody(change, { report, getDirections }) {
    if (change.kind === 'removed' && getDirections().includes('request')) {
      report({ message: 'Request body was removed.' });
    }
  },
});
