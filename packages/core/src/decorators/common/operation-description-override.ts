import type { Oas3Operation } from '../../typings/openapi.js';
import type { Oas2Operation } from '../../typings/swagger.js';
import { readFileAsStringSync, resolveRelativePath } from '../../utils/yaml-fs-helper.js';
import type { Oas3Decorator, Oas2Decorator } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const OperationDescriptionOverride: Oas3Decorator | Oas2Decorator = ({ operationIds }) => {
  return {
    Operation: {
      leave(operation: Oas2Operation | Oas3Operation, { report, location, config }: UserContext) {
        if (!operation.operationId) return;
        if (!operationIds)
          throw new Error(
            `Parameter "operationIds" is not provided for "operation-description-override" rule`
          );
        const operationId = operation.operationId;
        if (operationIds[operationId]) {
          try {
            const filePath = operationIds[operationId];
            operation.description = readFileAsStringSync(
              resolveRelativePath(filePath, config?.configPath)
            );
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
