import type { Oas3Rule, Oas2Rule } from '../../visitors';
import type { Oas2Operation } from '../../typings/swagger';
import type { Oas3Operation, Oas3Schema, Oas3_1Schema } from '../../typings/openapi';
import type { UserContext } from '../../walk';

export const OperationIdUnique: Oas3Rule | Oas2Rule = () => {
  const seenOperations = new Set();

  return {
    Operation(operation: Oas2Operation | Oas3Operation<Oas3Schema | Oas3_1Schema>, { report, location }: UserContext) {
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
