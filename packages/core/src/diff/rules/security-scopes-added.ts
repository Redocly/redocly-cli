import type { DiffRule } from '../types.js';
import { itemsOnlyIn, quoted } from './utils.js';

export const SecurityScopesAdded: DiffRule = () => ({
  SecurityRequirement(change, { report }) {
    // A requirement's properties are scheme names, and each value is its scope list.
    if (change.kind !== 'modified') return;
    const added = itemsOnlyIn(change.revision.value, change.base.value);
    if (!added.length) return;
    report({
      message: `Security scheme \`${change.property}\` requires new scopes: ${quoted(added)}.`,
    });
  },
});
