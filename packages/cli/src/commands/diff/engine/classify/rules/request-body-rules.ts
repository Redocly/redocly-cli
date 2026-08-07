import { becameTrue } from '../../predicates.js';
import { breaking, type DiffRule } from '../../types.js';

export const requestBodyBecameRequired: DiffRule = {
  id: 'request-body-became-required',
  description: 'Requiring a body that used to be optional breaks clients that send none.',
  visit(change, ctx) {
    if (change.property !== 'required' || ctx.polarity !== 'request') return;
    if (becameTrue(change.base?.value, change.revision?.value)) {
      return breaking('The request body became required.');
    }
    return undefined;
  },
};

export const requestBodyRemoved: DiffRule = {
  id: 'request-body-removed',
  description: 'Dropping the request body means the data clients send is no longer read.',
  visit(change, ctx) {
    if (change.kind !== 'removed' || ctx.polarity !== 'request') return;
    return breaking('The request body was removed.');
  },
};
