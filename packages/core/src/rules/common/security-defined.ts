import { Oas3Rule, Oas2Rule } from '../../visitors';
import { Location } from '../../ref-utils';
import { UserContext } from '../../walk';
import { Oas2Definition, Oas2Operation, Oas2SecurityScheme } from '../../typings/swagger';
import { Oas3Definition, Oas3Operation, Oas3SecurityScheme } from '../../typings/openapi';

export const SecurityDefined: Oas3Rule | Oas2Rule = () => {
  const referencedSchemes = new Map<
    string,
    {
      defined?: boolean;
      from: Location[];
    }
  >();

  const operationsWithoutSecurity: Location[] = [];
  let eachOperationHasSecurity: boolean = true;

  return {
    Root: {
      leave(root: Oas2Definition | Oas3Definition, { report }: UserContext) {
        for (const [name, scheme] of referencedSchemes.entries()) {
          if (scheme.defined) continue;
          for (const reportedFromLocation of scheme.from) {
            report({
              message: `There is no \`${name}\` security scheme defined.`,
              location: reportedFromLocation.key(),
            });
          }
        }

        if (root.security || eachOperationHasSecurity) {
          return;
        } else {
          for (const operationLocation of operationsWithoutSecurity) {
            report({
              message: `Every operation should have security defined on it or on the root level.`,
              location: operationLocation.key(),
            });
          }
        }
      },
    },
    SecurityScheme(_securityScheme: Oas2SecurityScheme | Oas3SecurityScheme, { key }: UserContext) {
      referencedSchemes.set(key.toString(), { defined: true, from: [] });
    },
    SecurityRequirement(requirements, { location }) {
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
    Operation(operation: Oas2Operation | Oas3Operation, { location }: UserContext) {
      if (!operation?.security) {
        eachOperationHasSecurity = false;
        operationsWithoutSecurity.push(location);
      }
    },
  };
};
