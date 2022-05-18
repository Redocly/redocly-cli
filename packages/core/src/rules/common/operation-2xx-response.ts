import { Oas3Rule, Oas2Rule } from '../../visitors';
import { UserContext } from '../../walk';

export const Operation2xxResponse: Oas3Rule | Oas2Rule = () => {
  return {
    ResponsesMap(responses: Record<string, object>, { report }: UserContext) {
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
