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
