import type { Oas3Rule, Oas2Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { validateResponseCodes } from '../utils.js';

export const Operation4xxResponse: Oas3Rule | Oas2Rule = ({
  validateWebhooks,
  excludeMethods: rawExcludeMethods = [],
}) => {
  const excludeMethods = rawExcludeMethods.map((method: string) => method.toLowerCase());
  // Responses visitors do not receive the HTTP method, so remember which operations to skip
  const excludedOperations = new Set<object>();

  const validateResponses = (
    responses: Record<string, object>,
    { report, parent }: UserContext
  ) => {
    if (excludedOperations.has(parent)) return;

    const codes = Object.keys(responses || {});

    validateResponseCodes({
      responseCodes: codes,
      codeRange: '4XX',
      report: report as UserContext['report'],
      reference: 'https://redocly.com/docs/cli/rules/oas/operation-4xx-response',
    });
  };

  return {
    Operation(operation: object, { key }: UserContext) {
      if (excludeMethods.includes(String(key).toLowerCase())) {
        excludedOperations.add(operation);
      }
    },
    Paths: {
      Responses: validateResponses,
    },
    WebhooksMap: {
      Responses(responses: Record<string, object>, ctx: UserContext) {
        if (!validateWebhooks) return;

        validateResponses(responses, ctx);
      },
    },
  };
};
