import type { DiffRule } from '../types.js';

export const MessageContentTypeChanged: DiffRule = () => ({
  Message(change, { report }) {
    if (change.kind !== 'modified' || change.property !== 'contentType') return;
    report({
      message: `The message content type changed from '${change.base.value}' to '${change.revision.value}'.`,
    });
  },
});
