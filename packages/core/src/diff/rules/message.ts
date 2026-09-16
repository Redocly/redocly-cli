import type { DiffRule } from '../types.js';

export const MessageRemoved: DiffRule = () => ({
  Message(change, { report }) {
    if (change.kind === 'removed') report({ message: 'The message was removed.' });
  },
  NamedMessages(change, { report }) {
    if (change.kind === 'removed') report({ message: 'Every message of the channel was removed.' });
  },
});

export const MessageContentTypeChanged: DiffRule = () => ({
  Message(change, { report }) {
    if (change.kind !== 'modified' || change.property !== 'contentType') return;
    report({
      message: `The message content type changed from '${change.base.value}' to '${change.revision.value}'.`,
    });
  },
});
