import { fieldOf } from '../../node-tree/access.js';
import type { DiffRule } from '../types.js';
import { describeChange, nameOf } from './utils.js';

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
    if (change.kind !== 'modified' || !SCHEME_IDENTITY.has(change.property)) return;

    // Switching the scheme's `type` drags its other fields along (an apiKey has
    // `in`/`name`, a bearer has `scheme`), so the type change speaks for them all.
    const typeChanged = fieldOf(change.node.base, 'type') !== fieldOf(change.node.revision, 'type');
    if (typeChanged && change.property !== 'type') return;

    report({
      message: describeChange(
        `\`${change.property}\` of security scheme \`${nameOf(change.node)}\``,
        change.base.value,
        change.revision.value
      ),
    });
  },
});
