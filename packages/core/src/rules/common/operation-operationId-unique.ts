import type { Oas3Rule, Oas2Rule } from '../../visitors.js';
import type { Oas2Operation } from '../../typings/swagger.js';
import type { Oas3Operation } from '../../typings/openapi.js';
import type { UserContext } from '../../walk.js';

export const OperationIdUnique: Oas3Rule | Oas2Rule = () => {
  const seenOperations = new Set();

  return {
    Operation(operation: Oas2Operation | Oas3Operation, { report, location }: UserContext) {
      if (!operation.operationId) return;
      if (seenOperations.has(operation.operationId)) {
        report({
          message: 'Every operation must have a unique `operationId`.',
          location: location.child([operation.operationId]),
        });
      }
      seenOperations.add(operation.operationId);
    },
  };
};
