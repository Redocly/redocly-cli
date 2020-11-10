import { Oas3Rule } from '../../visitors';

export const NoServerExample: Oas3Rule = () => {
  return {
    Server(server, { report, location }) {
      if (['example.com', 'localhost'].indexOf(server.url) !== -1) {
        report({
          message: 'Server `url` should not point at example.com.',
          location: location.child(['url']),
        });
      }
    },
  };
};
