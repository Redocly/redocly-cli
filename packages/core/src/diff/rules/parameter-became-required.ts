import type { DiffRule } from '../types.js';
import { describeParameter } from './utils.js';

export const ParameterBecameRequired: DiffRule = () => ({
  Parameter(change, { report, directions }) {
    if (change.kind !== 'modified' || change.property !== 'required') return;
    if (directions.includes('request') && change.revision.value === true) {
      report({ message: `${describeParameter(change.node)} became required.` });
    }
  },
});
