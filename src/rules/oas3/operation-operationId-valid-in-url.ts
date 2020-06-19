import { OAS3Rule } from '../../visitors';

const validURLsymbols = /^[A-Za-z0-9-._~:/?#\[\]@!\$&'()*+,;=]*$/;

export const OperationIDValidURL: OAS3Rule = () => {
  return {
    Operation(operation, { report, location }) {
      if (operation.operationId && !validURLsymbols.test(operation.operationId)) {
        report({
          message: 'Operation id should not have URL invalid characters.',
          location: location.append(['operationId']),
        });
      }
    },
  };
};
