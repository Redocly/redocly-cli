import type { DiffRule } from '../types.js';
import { becameTrue } from './constraints.js';

export const RequestBodyBecameRequired: DiffRule = () => ({
  RequestBody(change, { report, direction }) {
    if (change.kind !== 'modified' || change.property !== 'required' || direction !== 'request')
      return;
    if (becameTrue(change.base.value, change.revision.value)) {
      report({ message: 'The request body became required.' });
    }
  },
});

export const RequestBodyRemoved: DiffRule = () => ({
  RequestBody(change, { report, direction }) {
    if (change.kind === 'removed' && direction === 'request') {
      report({ message: 'The request body was removed.' });
    }
  },
});
