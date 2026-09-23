import type { DiffRule } from '../types.js';

// Security sits outside the request/response split, so the rule does not read the direction:
// introducing authentication breaks every client either way.

/**
 * A `security` list that appears where there was none lands on the list. `security: []`
 * states that no authentication is needed, so a first entry filling that list lands on the
 * entry; one more entry in a list that already had one only offers another way to
 * authenticate, which no existing client has to follow.
 */
export const SecurityRequirementAdded: DiffRule = () => ({
  SecurityRequirementList(change, { report }) {
    if (change.kind === 'added') report({ message: 'The API now requires authentication.' });
  },
  SecurityRequirement(change, { report }) {
    const list = change.node.parent?.base?.value;
    if (change.kind === 'added' && Array.isArray(list) && list.length === 0) {
      report({ message: 'The API now requires authentication.' });
    }
  },
});
