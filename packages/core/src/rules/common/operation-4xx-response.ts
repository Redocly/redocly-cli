import type { Oas3Rule, Oas2Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { validateResponseCodes } from '../utils.js';

export const Operation4xxResponse: Oas3Rule | Oas2Rule = (opts: any = {}) => {
  const { validateWebhooks, excludeMethods: rawExcludeMethods } = opts || {};
  const defaultExcluded = ['get', 'head', 'options'];
  const excludeMethods = Array.isArray(rawExcludeMethods)
    ? rawExcludeMethods.map((m: string) => String(m).toLowerCase())
    : defaultExcluded;

  return {
    Paths: {
      Operation: {
        leave(operation: Record<string, any>, { report, key, location }: UserContext) {
          const method = String(key).toLowerCase();
          if (excludeMethods.includes(method)) return;

          const codes = Object.keys((operation.responses as Record<string, object>) || {});

          // keep the reported location consistent with previous implementation
          const childReport: UserContext['report'] = (problem) =>
            report({ ...problem, location: location.child(['responses']).key() });

          validateResponseCodes({
            responseCodes: codes,
            codeRange: '4XX',
            report: childReport,
            reference: 'https://redocly.com/docs/cli/rules/oas/operation-4xx-response',
          });
        },
      },
    },
    WebhooksMap: {
      Operation: {
        leave(operation: Record<string, any>, { report, key, location }: UserContext) {
          if (!validateWebhooks) return;

          const method = String(key).toLowerCase();
          if (excludeMethods.includes(method)) return;

          const codes = Object.keys((operation.responses as Record<string, object>) || {});

          const childReport: UserContext['report'] = (problem) =>
            report({ ...problem, location: location.child(['responses']).key() });

          validateResponseCodes({
            responseCodes: codes,
            codeRange: '4XX',
            report: childReport,
            reference: 'https://redocly.com/docs/cli/rules/oas/operation-4xx-response',
          });
        },
      },
    },
  };
};
