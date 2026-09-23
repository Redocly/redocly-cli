import { isPlainObject } from '../../utils/is-plain-object.js';
import type { DiffRule } from '../types.js';
import { becameTrue } from './constraints.js';

// The last parameter of an operation leaves with the whole `parameters` list, and the first
// one arrives with it, so those changes land on the list rather than on a parameter.
export const ParameterRemoved: DiffRule = () => ({
  Parameter(change, { report, direction }) {
    if (change.kind === 'removed' && direction === 'request') {
      report({ message: 'Parameter was removed.' });
    }
  },
  ParameterList(change, { report, direction }) {
    if (change.kind === 'removed' && direction === 'request') {
      report({ message: 'Every parameter was removed.' });
    }
  },
});

function hasRequiredParameter(parameters: unknown[]): boolean {
  return parameters.some((parameter) => isPlainObject(parameter) && parameter.required === true);
}

export const ParameterAddedRequired: DiffRule = () => ({
  Parameter(change, { report, direction }) {
    if (change.kind !== 'added' || direction !== 'request') return;
    if (hasRequiredParameter([change.revision.value])) {
      report({ message: 'A new required parameter was added.' });
    }
  },
  ParameterList(change, { report, direction }) {
    if (change.kind !== 'added' || direction !== 'request') return;
    if (Array.isArray(change.revision.value) && hasRequiredParameter(change.revision.value)) {
      report({ message: 'A new required parameter was added.' });
    }
  },
});

export const ParameterBecameRequired: DiffRule = () => ({
  Parameter(change, { report, direction }) {
    if (change.kind !== 'modified' || change.property !== 'required' || direction !== 'request')
      return;
    if (becameTrue(change.base.value, change.revision.value)) {
      report({ message: 'Parameter became required.' });
    }
  },
});

// How a value is put on the wire is part of the contract: a client that encoded
// the old way is not understood after the change.
const SERIALIZATION = new Set(['style', 'explode', 'allowReserved', 'allowEmptyValue']);

export const ParameterSerializationChanged: DiffRule = () => ({
  Parameter(change, { report, direction }) {
    if (
      change.kind !== 'modified' ||
      !SERIALIZATION.has(change.property) ||
      direction !== 'request'
    )
      return;
    report({
      message: `Parameter \`${change.property}\` changed from '${change.base.value}' to '${change.revision.value}'.`,
    });
  },
});
