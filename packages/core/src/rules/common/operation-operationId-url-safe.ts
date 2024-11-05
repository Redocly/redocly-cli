import type { Oas3Rule, Oas2Rule } from '../../visitors';
import type { Oas2Operation } from '../../typings/swagger';
import type { Oas3Operation, Oas3Schema, Oas3_1Schema } from '../../typings/openapi';
import type { UserContext } from '../../walk';

// eslint-disable-next-line no-useless-escape
const validUrlSymbols = /^[A-Za-z0-9-._~:/?#\[\]@!\$&'()*+,;=]*$/;

export const OperationIdUrlSafe: Oas3Rule | Oas2Rule = () => {
  return {
    Operation(operation: Oas2Operation | Oas3Operation<Oas3Schema | Oas3_1Schema>, { report, location }: UserContext) {
      if (operation.operationId && !validUrlSymbols.test(operation.operationId)) {
        report({
          message: 'Operation `operationId` should not have URL invalid characters.',
          location: location.child(['operationId']),
        });
      }
    },
  };
};
