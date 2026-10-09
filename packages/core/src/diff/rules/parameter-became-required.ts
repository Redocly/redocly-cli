import { fieldOf, locationOf } from '../../node-tree/access.js';
import type { NodeEntry } from '../../node-tree/types.js';
import type { Location } from '../../ref-utils.js';
import { latestOf } from '../diff-node.js';
import type { DiffRule } from '../types.js';

// The first parameters of an operation arrive with the whole `parameters` list, so each required
// one is reported on the list, at its own `required` field.
export const ParameterBecameRequired: DiffRule = () => ({
  Parameter(change, { report, getDirections }) {
    if (!getDirections().includes('request')) return;

    const parameter = latestOf(change.node);
    const name = `\`${fieldOf(parameter, 'name')}\` ${fieldOf(parameter, 'in')} parameter`;

    if (change.kind === 'added' && fieldOf(parameter, 'required') === true) {
      report({ message: `Required ${name} was added.`, location: requiredFieldOf(parameter) });
    }
    if (
      change.kind === 'modified' &&
      change.property === 'required' &&
      change.revision.value === true
    ) {
      report({ message: `${name} became required.` });
    }
  },
  ParameterList(change, { report, getDirections }) {
    if (change.kind !== 'added' || !getDirections().includes('request')) return;

    for (const parameter of latestOf(change.node).children) {
      if (fieldOf(parameter, 'required') !== true) continue;

      const name = `\`${fieldOf(parameter, 'name')}\` ${fieldOf(parameter, 'in')} parameter`;
      report({ message: `Required ${name} was added.`, location: requiredFieldOf(parameter) });
    }
  },
});

// A `$ref` parameter is required where it points.
function requiredFieldOf(parameter: NodeEntry): Location {
  return locationOf(parameter).child(['required']);
}
