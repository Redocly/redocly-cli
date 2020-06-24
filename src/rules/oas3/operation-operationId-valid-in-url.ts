import { Oas3Rule } from '../../visitors';

const validUrlSymbols = /^[A-Za-z0-9-._~:/?#\[\]@!\$&'()*+,;=]*$/;

export const OperationIdValidUrl: Oas3Rule = () => {
  return {
    Operation(operation, { report, location }) {
      if (operation.operationId && !validUrlSymbols.test(operation.operationId)) {
        report({
          message: 'Operation id should not have URL invalid characters.',
          location: location.child(['operationId']),
        });
      }
    },
  };
};
