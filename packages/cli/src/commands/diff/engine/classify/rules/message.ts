import { breaking, type DiffRule } from '../../types.js';

// Registered for both `Message` and `NamedMessages`: dropping every message of a channel
// collapses into a single change on the map, dropping one lands on the message itself.
export const messageRemoved: DiffRule = {
  id: 'message-removed',
  description: 'Removing a message breaks every application that sends or receives it.',
  visit(change) {
    if (change.kind !== 'removed') return;
    return breaking(
      change.typeName === 'NamedMessages'
        ? 'Every message of the channel was removed.'
        : 'The message was removed.'
    );
  },
};

export const messageContentTypeChanged: DiffRule = {
  id: 'message-content-type-changed',
  description: 'A message in another content type cannot be decoded by existing clients.',
  visit(change) {
    if (change.property !== 'contentType') return;
    return breaking(
      `The message content type changed from '${change.base?.value}' to '${change.revision?.value}'.`
    );
  },
};
