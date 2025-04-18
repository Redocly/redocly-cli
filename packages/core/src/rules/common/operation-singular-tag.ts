import type { Oas3Rule, Oas2Rule } from '../../visitors.js';
import type { Oas2Operation } from '../../typings/swagger.js';
import type { Oas3Operation } from '../../typings/openapi.js';
import type { UserContext } from '../../walk.js';

export const OperationSingularTag: Oas3Rule | Oas2Rule = () => {
  return {
    Operation(operation: Oas2Operation | Oas3Operation, { report, location }: UserContext) {
      if (operation.tags && operation.tags.length > 1) {
        report({
          message: 'Operation `tags` object should have only one tag.',
          location: location.child(['tags']).key(),
        });
      }
    },
  };
};
