import { addedItems, isTypeNarrowed, isTypeWidened, missingItems } from '../../predicates.js';
import { breaking, type DiffRule } from '../../types.js';

export const schemaTypeChanged: DiffRule = {
  id: 'schema-type-changed',
  description:
    'Narrowing a type restricts what clients may send; widening restricts what they can rely on receiving.',
  visit(change, ctx) {
    if (change.property !== 'type') return;
    const before = change.base?.value;
    const after = change.revision?.value;
    if (ctx.polarity === 'request' && isTypeNarrowed(before, after)) {
      return breaking(`Schema type changed from '${before}' to '${after}'.`);
    }
    if (ctx.polarity === 'response' && isTypeWidened(before, after)) {
      return breaking(`Schema type changed from '${before}' to '${after}'.`);
    }
    return undefined;
  },
};

export const enumValuesRemoved: DiffRule = {
  id: 'enum-values-removed',
  description: 'Removing enum values restricts what clients may send.',
  visit(change, ctx) {
    if (change.property !== 'enum' || ctx.polarity !== 'request') return;
    const removed = missingItems(change.base?.value, change.revision?.value);
    if (removed.length) {
      return breaking(`Enum values removed: ${removed.join(', ')}.`);
    }
    return undefined;
  },
};

export const enumValuesAdded: DiffRule = {
  id: 'enum-values-added',
  description: 'Adding enum values to response data may send clients values they never handled.',
  visit(change, ctx) {
    if (change.property !== 'enum' || ctx.polarity !== 'response') return;
    const added = addedItems(change.base?.value, change.revision?.value);
    if (added.length) {
      return breaking(`Enum values added: ${added.join(', ')}.`);
    }
    return undefined;
  },
};

export const requiredPropertiesAdded: DiffRule = {
  id: 'required-properties-added',
  description: 'Requiring new request properties breaks clients that do not send them.',
  visit(change, ctx) {
    if (change.property !== 'required' || ctx.polarity !== 'request') return;
    const added = addedItems(change.base?.value, change.revision?.value);
    if (added.length) {
      return breaking(`Properties became required: ${added.join(', ')}.`);
    }
    return undefined;
  },
};

export const requiredPropertiesRemoved: DiffRule = {
  id: 'required-properties-removed',
  description: 'Un-requiring response properties breaks clients that rely on their presence.',
  visit(change, ctx) {
    if (change.property !== 'required' || ctx.polarity !== 'response') return;
    const removed = missingItems(change.base?.value, change.revision?.value);
    if (removed.length) {
      return breaking(`Properties are no longer required: ${removed.join(', ')}.`);
    }
    return undefined;
  },
};

export const propertyRemovedFromResponse: DiffRule = {
  id: 'property-removed-from-response',
  description: 'Removing a response property breaks clients that read it.',
  visit(change, ctx) {
    if (change.kind !== 'removed' || ctx.polarity !== 'response') return;
    const segments = change.pointer.split('/');
    if (segments[segments.length - 2] !== 'properties') return;
    return breaking('Schema property was removed.');
  },
};
