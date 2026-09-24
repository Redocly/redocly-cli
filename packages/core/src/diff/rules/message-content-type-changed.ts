import type { DiffRule } from '../types.js';
import { describeChange, nameOf } from './utils.js';

export const MessageContentTypeChanged: DiffRule = () => ({
  Message(change, { report }) {
    if (change.kind !== 'modified' || change.property !== 'contentType') return;
    report({
      message: describeChange(
        `Message \`${nameOf(change.node)}\` content type`,
        change.base.value,
        change.revision.value
      ),
    });
  },
});
