import { OAS3Rule } from '../../visitors';
import { missingRequiredField } from '../utils';

export const OperationDescription: OAS3Rule = () => {
  return {
    DefinitionRoot(root, { report, location }) {
      if (!root.servers) {
        report({
          message: 'OpenAPI servers must be present.',
        });
        return;
      }

      if (!Array.isArray(root.servers) || root.servers.length === 0) {
        report({
          message: 'OpenAPI servers must a non-empty array.',
          location: location.append(['servers']),
        });
      }
    },
  };
};
