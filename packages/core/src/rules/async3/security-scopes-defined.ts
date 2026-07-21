import { isRef, type Location } from '../../ref-utils.js';
import type { Async3SecurityScheme } from '../../typings/asyncapi3.js';
import type { Referenced } from '../../typings/openapi.js';
import type { Async3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { getSuggest } from '../utils.js';

export const SecurityScopesDefined: Async3Rule = (opts: { requireScopes?: boolean }) => {
  // In AsyncAPI 3 a security requirement is a reference to the scheme itself,
  // so schemes are collected from `security` lists and unused ones are skipped.
  const usedSchemes = new Map<string, { scheme: Async3SecurityScheme; location: Location }>();

  return {
    SecuritySchemeList(
      schemeList: Referenced<Async3SecurityScheme>[],
      { resolve, location }: UserContext
    ) {
      for (let itemIndex = 0; itemIndex < schemeList.length; itemIndex++) {
        const item = schemeList[itemIndex];
        const resolved = isRef(item)
          ? resolve<Async3SecurityScheme>(item)
          : { node: item, location: location.child([itemIndex]) };

        if (!resolved.node || !resolved.location) continue;
        usedSchemes.set(resolved.location.absolutePointer, {
          scheme: resolved.node,
          location: resolved.location,
        });
      }
    },
    Root: {
      leave(_root: unknown, { report }: UserContext) {
        for (const { scheme, location } of usedSchemes.values()) {
          if (scheme.type !== 'oauth2') continue;

          if (opts.requireScopes && !scheme.scopes?.length) {
            report({
              message: `The security scheme must list at least one scope.`,
              location: location.key(),
              reference: 'https://redocly.com/docs/cli/rules/common/security-scopes-defined',
            });
            continue;
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
        }
      },
    },
  };
};
