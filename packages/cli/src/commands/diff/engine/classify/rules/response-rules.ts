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
