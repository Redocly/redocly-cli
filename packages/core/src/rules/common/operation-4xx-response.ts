import type { Oas3Rule, Oas2Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { validateResponseCodes } from '../utils.js';

export const Operation4xxResponse: Oas3Rule | Oas2Rule = ({ validateWebhooks }) => {
  return {
    Paths: {
      Responses(responses: Record<string, object>, { report }: UserContext) {
        const codes = Object.keys(responses || {});

        validateResponseCodes({
          responseCodes: codes,
          codeRange: '4XX',
          report: report as UserContext['report'],
          reference: 'https://redocly.com/docs/cli/rules/oas/operation-4xx-response',
        });
      },
    },
    WebhooksMap: {
      Responses(responses: Record<string, object>, { report }: UserContext) {
        if (!validateWebhooks) return;

        const codes = Object.keys(responses || {});

        validateResponseCodes({
          responseCodes: codes,
          codeRange: '4XX',
          report: report as UserContext['report'],
          reference: 'https://redocly.com/docs/cli/rules/oas/operation-4xx-response',
        });
      },
    },
  };
};
