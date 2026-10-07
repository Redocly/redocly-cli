import { fieldOf } from '../../node-tree/access.js';
import { nameOf } from '../diff-node.js';
import type { DiffRule } from '../types.js';

const SCHEME_IDENTITY = new Set([
  'type',
  'scheme',
  'in',
  'name',
  'bearerFormat',
  'openIdConnectUrl',
]);

export const SecuritySchemeChanged: DiffRule = () => ({
  SecurityScheme(change, { report }) {
    if (change.kind === 'removed') {
      report({ message: `Security scheme \`${nameOf(change.node)}\` was removed.` });
    }
    if (change.kind !== 'modified' || !SCHEME_IDENTITY.has(change.property)) return;

    // Switching the scheme's `type` drags its other fields along (an apiKey has
    // `in`/`name`, a bearer has `scheme`), so the type change speaks for them all.
    const typeChanged = fieldOf(change.node.base, 'type') !== fieldOf(change.node.revision, 'type');
    if (typeChanged && change.property !== 'type') return;

    const subject = `\`${change.property}\` of security scheme \`${nameOf(change.node)}\``;
    const { value: before } = change.base;
    const { value: after } = change.revision;

    if (before === undefined) report({ message: `${subject} was set to '${after}'.` });
    else if (after === undefined) report({ message: `${subject} was removed.` });
    else report({ message: `${subject} changed from '${before}' to '${after}'.` });
  },
});
