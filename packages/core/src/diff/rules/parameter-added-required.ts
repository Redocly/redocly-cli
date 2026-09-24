import { isPlainObject } from '../../utils/is-plain-object.js';
import type { DiffRule } from '../types.js';
import { describeParameter } from './utils.js';

function hasRequiredParameter(parameters: unknown[]): boolean {
  return parameters.some((parameter) => isPlainObject(parameter) && parameter.required === true);
}

// The first parameter of an operation arrives with the whole `parameters` list, so that change
// lands on the list rather than on a parameter.
export const ParameterAddedRequired: DiffRule = () => ({
  Parameter(change, { report, directions }) {
    if (change.kind !== 'added' || !directions.includes('request')) return;
    if (hasRequiredParameter([change.revision.value])) {
      report({ message: `Required ${describeParameter(change.node)} was added.` });
    }
  },
  ParameterList(change, { report, directions }) {
    if (change.kind !== 'added' || !directions.includes('request')) return;
    if (Array.isArray(change.revision.value) && hasRequiredParameter(change.revision.value)) {
      report({ message: 'Required parameters were added.' });
    }
  },
});
