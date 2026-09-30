import type { DiffRule } from '../types.js';
import { describeParameter } from './utils.js';

// The last parameter of an operation leaves with the whole `parameters` list, so that change
// lands on the list rather than on a parameter.
export const ParameterRemoved: DiffRule = () => ({
  Parameter(change, { report, directions }) {
    if (change.kind === 'removed' && directions.includes('request')) {
      report({ message: `${describeParameter(change.node)} was removed.` });
    }
  },
  ParameterList(change, { report, directions }) {
    if (change.kind === 'removed' && directions.includes('request')) {
      report({ message: 'All parameters were removed.' });
    }
  },
});
