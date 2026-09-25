import { isPlainObject } from '../../utils/is-plain-object.js';
import type { DiffRule } from '../types.js';
import { describeParameter } from './utils.js';

function isRequired(parameter: unknown): boolean {
  return isPlainObject(parameter) && parameter.required === true;
}

// A client must now send a parameter that it did not have to: a new required one, or one that
// became required. The first parameter of an operation arrives with the whole `parameters` list,
// so that change lands on the list rather than on a parameter.
export const ParameterBecameRequired: DiffRule = () => ({
  Parameter(change, { report, directions }) {
    if (!directions.includes('request')) return;
    if (change.kind === 'added' && isRequired(change.revision.value)) {
      report({ message: `Required ${describeParameter(change.node)} was added.` });
    }
    if (
      change.kind === 'modified' &&
      change.property === 'required' &&
      change.revision.value === true
    ) {
      report({ message: `${describeParameter(change.node)} became required.` });
    }
  },
  ParameterList(change, { report, directions }) {
    if (change.kind !== 'added' || !directions.includes('request')) return;
    if (Array.isArray(change.revision.value) && change.revision.value.some(isRequired)) {
      report({ message: 'Required parameters were added.' });
    }
  },
});
