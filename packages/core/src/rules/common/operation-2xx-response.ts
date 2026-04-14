import type { Oas3Rule, Oas2Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { validateResponseCodes } from '../utils.js';

export const Operation2xxResponse: Oas3Rule | Oas2Rule = ({ validateWebhooks }) => {
  return {
    Paths: {
      Responses(responses: Record<string, object>, { report }: UserContext) {
        const codes = Object.keys(responses || {});

        validateResponseCodes(codes, '2XX', { report } as UserContext);
      },
    },
    WebhooksMap: {
      Responses(responses: Record<string, object>, { report }: UserContext) {
        if (!validateWebhooks) return;

        const codes = Object.keys(responses || {});

        validateResponseCodes(codes, '2XX', { report } as UserContext);
      },
    },
  };
};
