import type { Oas3Rule, Oas2Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { validateResponseCodes } from '../utils.js';

export const Operation4xxResponse: Oas3Rule | Oas2Rule = ({
  validateWebhooks,
  excludeMethods = [],
}) => {
  const excludedMethods = new Set(excludeMethods.map((method: string) => method.toLowerCase()));
  let insidePaths = false;
  let insideWebhooks = false;

  return {
    Paths: {
      enter() {
        insidePaths = true;
      },
      leave() {
        insidePaths = false;
      },
    },
    WebhooksMap: {
      enter() {
        insideWebhooks = true;
      },
      leave() {
        insideWebhooks = false;
      },
    },
    Operation: {
      skip(_operation: unknown, key: string | number) {
        const validated = insidePaths || (validateWebhooks && insideWebhooks);
        return !validated || excludedMethods.has(String(key).toLowerCase());
      },
      Responses(responses: Record<string, object>, { report }: UserContext) {
        validateResponseCodes({
          responseCodes: Object.keys(responses || {}),
          codeRange: '4XX',
          report: report as UserContext['report'],
          reference: 'https://redocly.com/docs/cli/rules/oas/operation-4xx-response',
        });
      },
    },
  };
};
