import type { Oas3Rule } from '../../visitors.js';

export const NoEmptyServers: Oas3Rule = () => {
  return {
    Root(root, { report, location }) {
      if (!root.hasOwnProperty('servers')) {
        report({
          message: 'Servers must be present.',
          location: location.child(['openapi']).key(),
          reference: 'https://redocly.com/docs/cli/rules/oas/no-empty-servers',
        });
        return;
      }

      if (!Array.isArray(root.servers) || root.servers.length === 0) {
        report({
          message: 'Servers must be a non-empty array.',
          location: location.child(['servers']).key(),
          reference: 'https://redocly.com/docs/cli/rules/oas/no-empty-servers',
        });
      }
    },
  };
};
