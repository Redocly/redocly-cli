import { isPlainObject } from '@redocly/openapi-core';

import { becameTrue } from '../../predicates.js';
import { breaking, type DiffRule } from '../../types.js';

export const parameterRemoved: DiffRule = {
  id: 'parameter-removed',
  description: 'Removing a request parameter breaks clients that send it.',
  visit(change, ctx) {
    if (change.kind !== 'removed' || ctx.polarity !== 'request') return;
    return breaking('Parameter was removed.');
  },
};

export const parameterAddedRequired: DiffRule = {
  id: 'parameter-added-required',
  description: 'Adding a new required parameter breaks clients that do not send it.',
  visit(change, ctx) {
    if (change.kind !== 'added' || ctx.polarity !== 'request') return;
    const value = change.revision?.value;
    if (isPlainObject(value) && value.required === true) {
      return breaking('A new required parameter was added.');
    }
    return undefined;
  },
};

export const parameterBecameRequired: DiffRule = {
  id: 'parameter-became-required',
  description: 'Marking an existing request parameter as required breaks clients that omit it.',
  visit(change, ctx) {
    if (change.property !== 'required' || ctx.polarity !== 'request') return;
    if (becameTrue(change.base?.value, change.revision?.value)) {
      return breaking('Parameter became required.');
    }
    return undefined;
  },
};

// How a value is put on the wire is part of the contract: a client that encoded
// the old way is not understood after the change.
const SERIALIZATION = new Set(['style', 'explode', 'allowReserved', 'allowEmptyValue']);

export const parameterSerializationChanged: DiffRule = {
  id: 'parameter-serialization-changed',
  description: 'Changing how a parameter is serialized breaks clients that encode it the old way.',
  visit(change, ctx) {
    if (!change.property || !SERIALIZATION.has(change.property)) return;
    if (ctx.polarity !== 'request') return;
    return breaking(
      `Parameter \`${change.property}\` changed from '${change.base?.value}' to '${change.revision?.value}'.`
    );
  },
};
