import { breaking, type DiffRule } from '../../types.js';

export const responseRemoved: DiffRule = {
  id: 'response-removed',
  description: 'Removing a response breaks clients that handle it.',
  visit(change) {
    if (change.kind !== 'removed') return;
    return breaking('Response was removed.');
  },
};

export const mediaTypeRemoved: DiffRule = {
  id: 'media-type-removed',
  description: 'Removing a media type breaks clients that produce or consume it.',
  visit(change) {
    if (change.kind !== 'removed') return;
    return breaking('Media type was removed.');
  },
};

// Registered for both `Header` and `HeadersMap`: dropping every header collapses
// into a single change on the map, dropping one lands on the header itself.
export const responseHeaderRemoved: DiffRule = {
  id: 'response-header-removed',
  description: 'Removing a response header breaks clients that read it.',
  visit(change, ctx) {
    if (change.kind !== 'removed' || ctx.polarity !== 'response') return;
    return breaking(
      change.typeName === 'HeadersMap'
        ? 'The response headers were removed.'
        : 'A response header was removed.'
    );
  },
};
