import { nameOf } from '../diff-node.js';
import type { DiffRule, DiffVisit } from '../types.js';

const operationIdChanged: DiffVisit = (change, { report }) => {
  if (change.kind !== 'modified' || change.property !== 'operationId') return;

  const { value: before } = change.base;
  const { value: after } = change.revision;
  if (before === undefined) return;

  const method = nameOf(change.node).toUpperCase();
  const subject = `\`operationId\` of operation \`${method} ${nameOf(change.node.parent!)}\``;

  if (after === undefined) report({ message: `${subject} was removed.` });
  else report({ message: `${subject} changed from '${before}' to '${after}'.` });
};

// Generated clients name their methods after `operationId`, so a changed or removed one breaks the
// code that calls them. A first `operationId` breaks nothing.
export const OperationIdChanged: DiffRule = () => ({
  Paths: { PathItem: { Operation: operationIdChanged } },
  WebhooksMap: { PathItem: { Operation: operationIdChanged } },
  CallbacksMap: { Callback: { PathItem: { Operation: operationIdChanged } } },
});
