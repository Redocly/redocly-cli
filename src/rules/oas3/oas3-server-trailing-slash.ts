import { OAS3Rule } from '../../visitors';

export const ServerNoTrailingSlash: OAS3Rule = () => {
  return {
    Server(server, { report, location }) {
      if (server.url.endsWith('/')) {
        report({
          message: 'Server URL should not have a trailing slash.',
          location: location.append(['url']),
        });
      }
    },
  };
};
