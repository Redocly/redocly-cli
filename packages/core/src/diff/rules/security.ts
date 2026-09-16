import { addedItems } from '../constraints.js';
import type { Change, DiffRule, DiffRuleContext } from '../types.js';

// Security sits outside the request/response split, so these rules do not read
// the direction: introducing authentication breaks every client either way.

/**
 * `security: []` states that no authentication is needed, so a first entry filling
 * that list introduces it. An entry added to a list that already had one only offers
 * one more way to authenticate, which no existing client has to follow.
 */
function fillsAnEmptyList(change: Change, { nodeAt, base }: DiffRuleContext): boolean {
  const parentKey = nodeAt(change.key)?.parentKey;
  const baseList = parentKey ? base(parentKey)?.raw : undefined;
  return Array.isArray(baseList) && baseList.length === 0;
}

// A `security` list that appears where there was none lands on the list, and a first
// entry filling an empty list lands on the entry.
export const SecurityRequirementAdded: DiffRule = () => ({
  SecurityRequirementList(change, { report }) {
    if (change.kind === 'added') report({ message: 'The API now requires authentication.' });
  },
  SecurityRequirement(change, context) {
    if (change.kind === 'added' && fillsAnEmptyList(change, context)) {
      context.report({ message: 'The API now requires authentication.' });
    }
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
  SecurityScheme(change, { report, base, revision }) {
    if (change.kind !== 'modified' || !SCHEME_IDENTITY.has(change.property)) return;

    // Switching the scheme's `type` drags its other fields along (an apiKey has
    // `in`/`name`, a bearer has `scheme`), so the type change speaks for them all.
    const typeChanged = base(change.key)?.properties.type !== revision(change.key)?.properties.type;
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
