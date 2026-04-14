import type { Oas3Operation } from '../../typings/openapi.js';
import type { Oas2Operation } from '../../typings/swagger.js';
import type { Oas3Rule, Oas2Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { validateDefinedAndNonEmpty } from '../utils.js';

export const OperationOperationId: Oas3Rule | Oas2Rule = () => {
  return {
    Root: {
      PathItem: {
        Operation(operation: Oas2Operation | Oas3Operation, ctx: UserContext) {
          validateDefinedAndNonEmpty('operationId', operation, ctx);
        },
      },
    },
  };
};
