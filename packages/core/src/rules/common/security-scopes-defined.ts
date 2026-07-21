import { isRef, type Location } from '../../ref-utils.js';
import type { Oas3SecurityScheme, Referenced } from '../../typings/openapi.js';
import type { Oas2SecurityScheme } from '../../typings/swagger.js';
import type { Oas2Rule, Oas3Rule } from '../../visitors.js';
import type { ResolveFn, UserContext } from '../../walk.js';
import { getSuggest } from '../utils.js';

// AsyncAPI 2 OAuth2 schemes share the `flows.*.scopes` shape with OAS3.
type SecurityScheme = Oas2SecurityScheme | Oas3SecurityScheme;
type OAuth2Flow = { scopes?: Record<string, string> };

// The `flows` object and each flow can be behind a `$ref`, so they are
// resolved relative to the file that contains them.
function getDefinedScopes(
  scheme: SecurityScheme,
  resolve: ResolveFn,
  schemeLocation: Location
): string[] {
  if ('flows' in scheme && scheme.flows) {
    const { node: flows, location: flowsLocation } = isRef(scheme.flows)
      ? resolve<Record<string, Referenced<OAuth2Flow>>>(
          scheme.flows,
          schemeLocation.source.absoluteRef
        )
      : { node: scheme.flows, location: schemeLocation };
    const flowsSource = (flowsLocation ?? schemeLocation).source.absoluteRef;

    const scopes = Object.values(flows ?? {}).flatMap((flow) => {
      const resolvedFlow = isRef(flow) ? resolve<OAuth2Flow>(flow, flowsSource).node : flow;
      return Object.keys(resolvedFlow?.scopes || {});
    });
    return [...new Set(scopes)];
  }
  // OAS2 schemes list scopes directly on the scheme
  return Object.keys((scheme as Oas2SecurityScheme).scopes || {});
}

export const SecurityScopesDefined: Oas3Rule | Oas2Rule = (opts: { requireScopes?: boolean }) => {
  const definedSchemes = new Map<string, { type: string; definedScopes: string[] }>();
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

          for (let scopeIndex = 0; scopeIndex < scopes.length; scopeIndex++) {
            const scope = scopes[scopeIndex];
            if (!scheme.definedScopes.includes(scope)) {
              report({
                message: `The "${scope}" scope is not defined in the "${schemeName}" security scheme.`,
                location: location.child([scopeIndex]),
                suggest: getSuggest(scope, scheme.definedScopes),
                reference: 'https://redocly.com/docs/cli/rules/common/security-scopes-defined',
              });
            }
          }
        }
      },
    },
    SecurityScheme(scheme: SecurityScheme, { key, resolve, location }: UserContext) {
      definedSchemes.set(key.toString(), {
        type: scheme.type,
        definedScopes: scheme.type === 'oauth2' ? getDefinedScopes(scheme, resolve, location) : [],
      });
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
