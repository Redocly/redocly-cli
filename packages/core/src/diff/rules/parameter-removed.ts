import { fieldOf } from '../../node-tree/access.js';
import { latestOf } from '../diff-node.js';
import type { DiffRule } from '../types.js';

export const ParameterRemoved: DiffRule = () => ({
  Parameter(change, { report, getDirections }) {
    if (!getDirections().includes('request')) return;

    if (change.kind === 'removed') {
      const parameter = latestOf(change.node);
      const name = `\`${fieldOf(parameter, 'name')}\` ${fieldOf(parameter, 'in')} parameter`;
      report({ message: `${name} was removed.` });
    }
    if (change.kind !== 'modified') return;

    // The client still sends the parameter as the base had it, so both reports name that one.
    const oldName = fieldOf(change.node.base, 'name');
    const oldIn = fieldOf(change.node.base, 'in');
    const { value: before } = change.base;
    const { value: after } = change.revision;

    if (change.property === 'in') {
      report({ message: `\`${oldName}\` ${before} parameter is now a ${after} parameter.` });
    }

    // A path parameter is named for the docs only, and a header name is not case-sensitive, so
    // renaming those asks nothing of the client.
    const caseOnly =
      oldIn === 'header' && String(before).toLowerCase() === String(after).toLowerCase();
    if (change.property === 'name' && oldIn !== 'path' && !caseOnly) {
      report({ message: `\`${before}\` ${oldIn} parameter was renamed to \`${after}\`.` });
    }
  },
  ParameterList(change, { report, getDirections }) {
    if (change.kind === 'removed' && getDirections().includes('request')) {
      report({ message: 'All parameters were removed.' });
    }
  },
});
