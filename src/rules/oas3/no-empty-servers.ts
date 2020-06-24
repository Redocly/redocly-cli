import { Oas3Rule } from '../../visitors';

export const NoEmptyServers: Oas3Rule = () => {
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
          location: location.child(['servers']),
        });
      }
    },
  };
};
