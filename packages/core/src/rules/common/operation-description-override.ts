import { Oas3Decorator, Oas2Decorator } from '../../visitors';
import { Oas2Operation } from '../../typings/swagger';
import { Oas3Operation } from '../../typings/openapi';
import { readFileSync } from '../../utils';

export const OperationDescriptionOverride: Oas3Decorator | Oas2Decorator = ({ operationIds }) => {
  return {
    Operation: {
      leave(operation: Oas2Operation | Oas3Operation) {
        if (!operation.operationId) return;
        if (!operationIds) throw new Error(`Parameter "operationIds" is not provided`);
        const operationId = operation.operationId;
        if (operationIds[operationId]) {
          operation.description = readFileSync(operationIds[operationId]);
        }
      },
    },
  };
};
