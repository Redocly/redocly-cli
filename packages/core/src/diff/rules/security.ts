import { fieldOf } from '../../node-map/access.js';
import type { DiffRule } from '../types.js';
import { addedItems } from './constraints.js';

// Security sits outside the request/response split, so these rules do not read
// the direction: introducing authentication breaks every client either way.

/**
 * A `security` list that appears where there was none lands on the list. `security: []`
 * states that no authentication is needed, so a first entry filling that list lands on the
 * entry; one more entry in a list that already had one only offers another way to
 * authenticate, which no existing client has to follow.
 */
export const SecurityRequirementAdded: DiffRule = () => ({
  SecurityRequirementList: {
    enter(change, { report }) {
      if (change.kind === 'added') report({ message: 'The API now requires authentication.' });
    },
    SecurityRequirement(change, { report }) {
      const list = change.pair.parent?.base?.value;
      if (change.kind === 'added' && Array.isArray(list) && list.length === 0) {
        report({ message: 'The API now requires authentication.' });
      }
    },
  },
});

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
    const typeChanged = fieldOf(change.pair.base, 'type') !== fieldOf(change.pair.revision, 'type');
    if (typeChanged && change.property !== 'type') return;

    report({
      message: `Security scheme \`${change.property}\` changed from '${change.base.value}' to '${change.revision.value}'.`,
    });
  },
});

export const SecuritySchemeRemoved: DiffRule = () => ({
  SecurityScheme(change, { report }) {
    if (change.kind === 'removed') report({ message: 'A security scheme was removed.' });
  },
});

export const SecurityScopesAdded: DiffRule = () => ({
  SecurityRequirement(change, { report }) {
    // A requirement's properties are scheme names, and each value is its scope list.
    if (change.kind !== 'modified') return;
    const added = addedItems(change.base.value, change.revision.value);
    if (!added.length) return;
    report({ message: `Scheme \`${change.property}\` requires new scopes: ${added.join(', ')}.` });
  },
});
