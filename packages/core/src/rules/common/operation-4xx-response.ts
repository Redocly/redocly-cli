import type { Oas3Rule, Oas2Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { validateResponseCodes } from '../utils.js';

export const Operation4xxResponse: Oas3Rule | Oas2Rule = ({
  validateWebhooks,
  excludedMethods = [],
}) => {
  const excluded = new Set(excludedMethods.map((method: string) => method.toLowerCase()));
  const Operation = {
    skip: (_operation: unknown, key: string | number) => excluded.has(String(key).toLowerCase()),
    Responses(responses: Record<string, object>, { report }: UserContext) {
      validateResponseCodes({
        responseCodes: Object.keys(responses || {}),
        codeRange: '4XX',
        report: report as UserContext['report'],
        reference: 'https://redocly.com/docs/cli/rules/oas/operation-4xx-response',
      });
    },
  };

  return {
    Paths: { Operation, Callback: { Operation } },
    WebhooksMap: { skip: () => !validateWebhooks, Operation, Callback: { Operation } },
  };
};
