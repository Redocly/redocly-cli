import type { Location } from '../../ref-utils.js';
import type { Oas3SecurityScheme } from '../../typings/openapi.js';
import type { Oas2SecurityScheme } from '../../typings/swagger.js';
import type { Oas2Rule, Oas3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { getSuggest } from '../utils.js';

// AsyncAPI 2 OAuth2 schemes share the `flows.*.scopes` shape with OAS3.
type SecurityScheme = Oas2SecurityScheme | Oas3SecurityScheme;

function getDefinedScopes(scheme: SecurityScheme): string[] {
  if ('flows' in scheme && scheme.flows) {
    const scopes = Object.values(scheme.flows).flatMap((flow) => Object.keys(flow?.scopes || {}));
    return [...new Set(scopes)];
  }
  // OAS2 schemes list scopes directly on the scheme
  return Object.keys((scheme as Oas2SecurityScheme).scopes || {});
}

export const SecurityScopesDefined: Oas3Rule | Oas2Rule = (opts: { requireScopes?: boolean }) => {
  const definedSchemes = new Map<string, SecurityScheme>();
  const usedScopes: Array<{ schemeName: string; scopes: string[]; location: Location }> = [];

  return {
    Root: {
      leave(_root: unknown, { report }: UserContext) {
        for (const { schemeName, scopes, location } of usedScopes) {
          const scheme = definedSchemes.get(schemeName);

          // Undefined schemes are reported by `security-defined`;
          // other scheme types don't declare scopes that can be checked statically.
          if (scheme?.type !== 'oauth2') continue;

          if (opts.requireScopes && scopes.length === 0) {
            report({
              message: `The "${schemeName}" security requirement must list at least one scope.`,
              location: location.key(),
              reference: 'https://redocly.com/docs/cli/rules/common/security-scopes-defined',
            });
            continue;
          }

          const definedScopes = getDefinedScopes(scheme);
          for (let scopeIndex = 0; scopeIndex < scopes.length; scopeIndex++) {
            const scope = scopes[scopeIndex];
            if (!definedScopes.includes(scope)) {
              report({
                message: `The "${scope}" scope is not defined in the "${schemeName}" security scheme.`,
                location: location.child([scopeIndex]),
                suggest: getSuggest(scope, definedScopes),
                reference: 'https://redocly.com/docs/cli/rules/common/security-scopes-defined',
              });
            }
          }
        }
      },
    },
    SecurityScheme(scheme: SecurityScheme, { key }: UserContext) {
      definedSchemes.set(key.toString(), scheme);
    },
    SecurityRequirement(
      requirement: Record<string, string[] | undefined>,
      { location }: UserContext
    ) {
      for (const [schemeName, scopes] of Object.entries(requirement)) {
        usedScopes.push({
          schemeName,
          scopes: scopes || [],
          location: location.child([schemeName]),
        });
      }
    },
  };
};
