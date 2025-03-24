import { validateDefinedAndNonEmpty } from '../utils.js';

import type { Oas3Rule, Oas2Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import type { Oas2Operation } from '../../typings/swagger.js';
import type { Oas3Operation } from '../../typings/openapi.js';

export const OperationSummary: Oas3Rule | Oas2Rule = () => {
  return {
    Operation(operation: Oas2Operation | Oas3Operation, ctx: UserContext) {
      validateDefinedAndNonEmpty('summary', operation, ctx);
    },
  };
};
