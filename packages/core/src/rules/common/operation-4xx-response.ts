import { Oas3Rule, Oas2Rule } from '../../visitors';
import { UserContext } from '../../walk';

export const Operation4xxResponse: Oas3Rule | Oas2Rule = () => {
  return {
    ResponsesMap(responses: Record<string, object>, { report }: UserContext) {
      const codes = Object.keys(responses);

      if (!codes.some((code) => /4[Xx0-9]{2}/.test(code))) {
        report({
          message: 'Operation must have at least one `4xx` response.',
          location: { reportOnKey: true },
        });
      }
    },
  };
};
