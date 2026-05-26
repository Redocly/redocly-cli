import { operationHasSecurity } from '../common/operation-has-security.js';

import type { Location } from '../../ref-utils.js';
import type { Async2Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const SecurityDefined: Async2Rule = () => {
  const referencedSchemes = new Map<
    string,
    {
      defined?: boolean;
      from: Location[];
    }
  >();
  const operationsWithoutSecurity: Location[] = [];
  let eachOperationHasSecurity = true;
  let anyServerHasSecurity = false;

  return {
    Root: {
      leave(_root: unknown, { report }: UserContext) {
        for (const [name, scheme] of referencedSchemes.entries()) {
          if (scheme.defined) continue;
          for (const reportedFromLocation of scheme.from) {
            report({
              message: `There is no \`${name}\` security scheme defined.`,
              location: reportedFromLocation.key(),
            });
          }
        }

        if (!eachOperationHasSecurity && !anyServerHasSecurity) {
          for (const operationLocation of operationsWithoutSecurity) {
            report({
              message: `Every operation should have security defined on it.`,
              location: operationLocation.key(),
            });
          }
        }
      },
    },
    SecurityScheme(_scheme: unknown, { key }: UserContext) {
      referencedSchemes.set(key.toString(), { defined: true, from: [] });
    },
    SecurityRequirement(requirements: Record<string, string[]>, { location }: UserContext) {
      for (const requirement of Object.keys(requirements)) {
        const authScheme = referencedSchemes.get(requirement);
        const requirementLocation = location.child([requirement]);
        if (!authScheme) {
          referencedSchemes.set(requirement, { from: [requirementLocation] });
        } else {
          authScheme.from.push(requirementLocation);
        }
      }
    },
    Server(server: { security?: unknown }) {
      if (server?.security) anyServerHasSecurity = true;
    },
    Channel: {
      Operation(operation: { security?: unknown; traits?: unknown[] },
        { location, resolve }: UserContext
      ) {
        if (operationHasSecurity(operation, resolve)) return;
        eachOperationHasSecurity = false;
        operationsWithoutSecurity.push(location);
      },
    },
  };
};
