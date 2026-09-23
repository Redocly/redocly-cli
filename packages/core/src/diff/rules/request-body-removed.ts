import type { DiffRule } from '../types.js';

export const RequestBodyRemoved: DiffRule = () => ({
  RequestBody(change, { report, directions }) {
    if (change.kind === 'removed' && directions.includes('request')) {
      report({ message: 'The request body was removed.' });
    }
  },
});
