import { nameOf } from '../diff-node.js';
import type { DiffRule, DiffVisit } from '../types.js';
import { isRootField } from './utils.js';

// An OpenAPI operation is named by its method and its path, or the URL of its callback.
const pathOperationRemoved: DiffVisit = (change, { report }) => {
  if (change.kind !== 'removed') return;

  const method = nameOf(change.node).toUpperCase();
  report({ message: `Operation \`${method} ${nameOf(change.node.parent!)}\` was removed.` });
};

export const OperationRemoved: DiffRule = () => ({
  Paths: { PathItem: { Operation: pathOperationRemoved } },
  WebhooksMap: { PathItem: { Operation: pathOperationRemoved } },
  CallbacksMap: { Callback: { PathItem: { Operation: pathOperationRemoved } } },
  NamedOperations: {
    Operation(change, { report }) {
      if (change.kind === 'removed') {
        report({ message: `Operation \`${nameOf(change.node)}\` was removed.` });
      }
    },
  },
  Root: {
    NamedOperations(change, { report }) {
      if (change.kind === 'removed' && isRootField(change.node)) {
        report({ message: 'All operations were removed.' });
      }
    },
  },
});
