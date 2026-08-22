import { addedItems } from '../../predicates.js';
import { breaking, type DiffRule, type RawChange, type RuleContext } from '../../types.js';

// Security sits outside the request/response split, so these rules do not read
// the polarity: introducing authentication breaks every client either way.

/**
 * `security: []` states that no authentication is needed, so a first entry filling
 * that list introduces it. An entry added to a list that already had one only offers
 * one more way to authenticate, which no existing client has to follow.
 */
function fillsAnEmptyList(change: RawChange, ctx: RuleContext): boolean {
  const parentPointer = ctx.nodeAt(change.pointer)?.parentPointer;
  const baseList = parentPointer ? ctx.base(parentPointer)?.raw : undefined;
  return Array.isArray(baseList) && baseList.length === 0;
}

// Registered for both `SecurityRequirementList` and `SecurityRequirement`: a
// `security` list that appears where there was none lands on the list, and a first
// entry filling an empty list lands on the entry.
export const securityRequirementAdded: DiffRule = {
  id: 'security-requirement-added',
  description: 'Requiring authentication where there was none breaks every existing client.',
  visit(change, ctx) {
    if (change.kind !== 'added') return;
    if (change.typeName !== 'SecurityRequirementList' && !fillsAnEmptyList(change, ctx)) return;
    return breaking('The API now requires authentication.');
  },
};

const SCHEME_IDENTITY = new Set([
  'type',
  'scheme',
  'in',
  'name',
  'bearerFormat',
  'openIdConnectUrl',
]);

export const securitySchemeChanged: DiffRule = {
  id: 'security-scheme-changed',
  description: 'Changing how a scheme authenticates breaks clients that implemented the old way.',
  visit(change, ctx) {
    if (!change.property || !SCHEME_IDENTITY.has(change.property)) return;

    // Switching the scheme's `type` drags its other fields along (an apiKey has
    // `in`/`name`, a bearer has `scheme`), so the type change speaks for them all.
    const typeChanged =
      ctx.base(change.pointer)?.scalars.type !== ctx.revision(change.pointer)?.scalars.type;
    if (typeChanged && change.property !== 'type') return;

    return breaking(
      `Security scheme \`${change.property}\` changed from '${change.base?.value}' to '${change.revision?.value}'.`
    );
  },
};

export const securitySchemeRemoved: DiffRule = {
  id: 'security-scheme-removed',
  description: 'Removing a scheme leaves clients with no way to authenticate through it.',
  visit(change) {
    if (change.kind !== 'removed') return;
    return breaking('A security scheme was removed.');
  },
};

export const securityScopesAdded: DiffRule = {
  id: 'security-scopes-added',
  description: 'A new required scope breaks clients whose credentials do not include it.',
  visit(change) {
    // A requirement's properties are scheme names, and each value is its scope list.
    if (change.kind !== 'changed' || !change.property) return;
    const added = addedItems(change.base?.value, change.revision?.value);
    if (!added.length) return;
    return breaking(`Scheme \`${change.property}\` requires new scopes: ${added.join(', ')}.`);
  },
};
