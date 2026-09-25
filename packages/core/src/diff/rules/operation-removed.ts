import { typeOf } from '../diff-tree.js';
import type { DiffNode, DiffRule } from '../types.js';
import { nameOf } from './utils.js';

// An OpenAPI operation is named by its method and path; an AsyncAPI one by its own key.
function describeOperation(operation: DiffNode): string {
  const pathItem = operation.parent;
  if (pathItem && typeOf(pathItem) === 'PathItem') {
    return `${nameOf(operation).toUpperCase()} ${nameOf(pathItem)}`;
  }
  return nameOf(operation);
}

export const OperationRemoved: DiffRule = () => ({
  Operation(change, { report }) {
    if (change.kind === 'removed') {
      report({ message: `Operation \`${describeOperation(change.node)}\` was removed.` });
    }
  },
});
