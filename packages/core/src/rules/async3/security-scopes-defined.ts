import type { Async3SecurityScheme } from '../../typings/asyncapi3.js';
import type { Async3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { getSuggest } from '../utils.js';

export const SecurityScopesDefined: Async3Rule = (opts: { requireScopes?: boolean }) => {
  return {
    SecurityScheme(scheme: Async3SecurityScheme, { report, location }: UserContext) {
      if (scheme?.type !== 'oauth2') return;

      if (opts.requireScopes && !scheme.scopes?.length) {
        report({
          message: `The security scheme must list at least one scope.`,
          location: location.key(),
          reference: 'https://redocly.com/docs/cli/rules/common/security-scopes-defined',
        });
        return;
      }

      const availableScopes = [
        ...new Set(
          Object.values(scheme.flows || {}).flatMap((flow) =>
            Object.keys(flow?.availableScopes || {})
          )
        ),
      ];

      const usedScopes = scheme.scopes || [];
      for (let scopeIndex = 0; scopeIndex < usedScopes.length; scopeIndex++) {
        const scope = usedScopes[scopeIndex];
        if (!availableScopes.includes(scope)) {
          report({
            message: `The "${scope}" scope is not defined in the available scopes of the security scheme flows.`,
            location: location.child(['scopes', scopeIndex]),
            suggest: getSuggest(scope, availableScopes),
            reference: 'https://redocly.com/docs/cli/rules/common/security-scopes-defined',
          });
        }
      }
    },
  };
};
