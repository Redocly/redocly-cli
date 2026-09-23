import type { DiffRule } from '../types.js';

// The last parameter of an operation leaves with the whole `parameters` list, so that change
// lands on the list rather than on a parameter.
export const ParameterRemoved: DiffRule = () => ({
  Parameter(change, { report, directions }) {
    if (change.kind === 'removed' && directions.includes('request')) {
      report({ message: 'Parameter was removed.' });
    }
  },
  ParameterList(change, { report, directions }) {
    if (change.kind === 'removed' && directions.includes('request')) {
      report({ message: 'Every parameter was removed.' });
    }
  },
});
