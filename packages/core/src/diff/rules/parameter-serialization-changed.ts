import { fieldOf } from '../../node-tree/access.js';
import { latestOf } from '../diff-node.js';
import type { DiffRule } from '../types.js';

// How a value is put on the wire is part of the contract: a client that encoded
// the old way is not understood after the change.
const SERIALIZATION = new Set(['style', 'explode', 'allowReserved', 'allowEmptyValue']);

export const ParameterSerializationChanged: DiffRule = () => ({
  Parameter(change, { report, getDirections }) {
    if (change.kind !== 'modified' || !SERIALIZATION.has(change.property)) return;
    if (!getDirections().includes('request')) return;

    const parameter = latestOf(change.node);
    const name = `\`${fieldOf(parameter, 'name')}\` ${fieldOf(parameter, 'in')} parameter`;
    const subject = `\`${change.property}\` of ${name}`;
    const { value: before } = change.base;
    const { value: after } = change.revision;

    if (before === undefined) report({ message: `${subject} was set to '${after}'.` });
    else if (after === undefined) report({ message: `${subject} was removed.` });
    else report({ message: `${subject} changed from '${before}' to '${after}'.` });
  },
});
