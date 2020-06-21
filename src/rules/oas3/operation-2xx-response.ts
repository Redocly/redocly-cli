import { Oas3Rule } from '../../visitors';

export const Operation2xxResponse: Oas3Rule = () => {
  return {
    ResponsesMap(responses, { report }) {
      const codes = Object.keys(responses);
      if (!codes.some((code) => code === 'default' || /2[Xx0-9]{2}/.test(code))) {
        report({
          message: 'Operation must have at least one `2xx` response.',
          location: { reportOnKey: true },
        });
      }
    },
  };
};
