import { valueOf } from '../../node-tree/access.js';
import { isPlainObject } from '../../utils/is-plain-object.js';
import { itemsNotIn } from '../../utils/items-not-in.js';
import type { DiffRule } from '../types.js';

/** The schemes a client authenticates with, each with the scopes that its credentials hold. */
type Credentials = Record<string, unknown>;

// A client passes a requirement when it has every scheme of it, with every scope that the scheme
// asks for. An empty list, or a missing one, asks for no authentication.
function passesOne(credentials: Credentials, requirements: unknown): boolean {
  if (!Array.isArray(requirements) || requirements.length === 0) return true;
  return requirements.some(
    (requirement) =>
      isPlainObject(requirement) &&
      Object.entries(requirement).every(
        ([scheme, scopes]) =>
          scheme in credentials && itemsNotIn(scopes, credentials[scheme]).length === 0
      )
  );
}

// Security sits outside the request/response split, so the rule does not read the direction.
// Each change asks one question: do the clients that authenticated before still pass one of the
// requirements of the revision?
export const SecurityRequirementChanged: DiffRule = () => ({
  SecurityRequirementList(change, { report }) {
    if (change.kind === 'added' && !passesOne({}, change.revision.value)) {
      report({ message: 'Authentication became required.' });
    }
  },
  SecurityRequirement(change, { report }) {
    const list = change.node.parent;
    const requirements = list?.revision && valueOf(list.revision);

    if (change.kind === 'added') {
      // Before, the list was empty and asked for no authentication; otherwise the new
      // requirement only offers one more way to pass.
      const before = list?.base && valueOf(list.base);
      if (Array.isArray(before) && before.length === 0 && !passesOne({}, requirements)) {
        report({ message: 'Authentication became required.' });
      }
      return;
    }

    const credentials = change.node.base && valueOf(change.node.base);
    if (!isPlainObject(credentials) || passesOne(credentials, requirements)) return;

    const schemes = Object.keys(credentials).join(' + ');
    if (change.kind === 'removed') {
      report({ message: `Security requirement \`${schemes}\` is no longer accepted.` });
    } else if (change.base.value === undefined) {
      // A scheme the requirement did not have: a client must now hold it too.
      report({
        message: `Security requirement \`${schemes}\` now requires \`${change.property}\`.`,
      });
    } else {
      // The requirement keeps this scheme: its value is the list of scopes.
      const added = itemsNotIn(change.revision.value, change.base.value);
      if (!added.length) return;
      const scopes = added.map((scope) => `'${scope}'`).join(', ');
      report({
        message: `Security scheme \`${change.property}\` requires new scopes: ${scopes}.`,
      });
    }
  },
});
