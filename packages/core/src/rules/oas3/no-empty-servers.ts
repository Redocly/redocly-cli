import { Oas3Rule } from '../../visitors';

export const NoEmptyServers: Oas3Rule = () => {
  return {
    DefinitionRoot(root, { report, location }) {
      if (!root.servers) {
        report({
          message: 'Servers must be present.',
        });
        return;
      }

      if (!Array.isArray(root.servers) || root.servers.length === 0) {
        report({
          message: 'Servers must be a non-empty array.',
          location: location.child(['servers']).key(),
        });
      }
    },
  };
};
