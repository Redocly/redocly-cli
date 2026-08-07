import { breaking, type DiffRule } from '../../types.js';

// Security sits outside the request/response split, so these rules do not read
// the polarity: introducing authentication breaks every client either way.

export const securityRequirementAdded: DiffRule = {
  id: 'security-requirement-added',
  description: 'Requiring authentication where there was none breaks every existing client.',
  visit(change) {
    // The whole `security` list appearing means authentication was introduced.
    // A new entry inside an existing list is one more accepted alternative, which
    // arrives as a change on the entry rather than on the list, and is not breaking.
    if (change.kind !== 'added') return;
    return breaking('The operation now requires authentication.');
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
