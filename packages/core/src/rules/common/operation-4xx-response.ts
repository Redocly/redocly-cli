import type { Oas3Operation } from '../../typings/openapi.js';
import type { Oas2Operation } from '../../typings/swagger.js';
import type { Oas3Rule, Oas2Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { validateResponseCodes } from '../utils.js';

export const Operation4xxResponse: Oas3Rule | Oas2Rule = ({
  validateWebhooks,
  excludeMethods: rawExcludeMethods = [],
}) => {
  const excludeMethods = rawExcludeMethods.map((method: string) => method.toLowerCase());
  // Responses visitors do not receive the HTTP method, so remember which operations to skip.
  // The walker visits each operation object once, so an operation shared by several methods is decided by the first one.
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
    Operation(operation: Oas2Operation | Oas3Operation, { key, rawNode }: UserContext) {
      if (excludeMethods.includes(String(key).toLowerCase())) {
        excludedOperations.add(operation);
        // keys written next to a $ref are walked with the $ref object as their parent
        excludedOperations.add(rawNode);
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
