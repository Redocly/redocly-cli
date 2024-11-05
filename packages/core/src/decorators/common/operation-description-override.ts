import { readFileAsStringSync } from '../../utils';

import type { Oas3Decorator, Oas2Decorator } from '../../visitors';
import type { Oas2Operation } from '../../typings/swagger';
import type { Oas3Schema, Oas3_1Schema, Oas3Operation } from '../../typings/openapi';
import type { UserContext } from '../../walk';

export const OperationDescriptionOverride: Oas3Decorator | Oas2Decorator = ({ operationIds }) => {
  return {
    Operation: {
      leave(operation: Oas2Operation | Oas3Operation<Oas3Schema | Oas3_1Schema>, { report, location }: UserContext) {
        if (!operation.operationId) return;
        if (!operationIds)
          throw new Error(
            `Parameter "operationIds" is not provided for "operation-description-override" rule`
          );
        const operationId = operation.operationId;
        if (operationIds[operationId]) {
          try {
            operation.description = readFileAsStringSync(operationIds[operationId]);
          } catch (e) {
            report({
              message: `Failed to read markdown override file for operation "${operationId}".\n${e.message}`,
              location: location.child('operationId').key(),
            });
          }
        }
      },
    },
  };
};
