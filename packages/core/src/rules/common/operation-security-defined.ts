import { Oas3Rule, Oas2Rule } from '../../visitors';
import { Location } from '../../ref-utils';
import { UserContext } from '../../walk';
import { Oas2SecurityScheme } from '../../typings/swagger';
import { Oas3SecurityScheme } from '../../typings/openapi';

export const OperationSecurityDefined: Oas3Rule | Oas2Rule = () => {
  let referencedSchemes = new Map<
    string,
    {
      defined?: boolean;
      from: Location[];
    }
  >();

  return {
    DefinitionRoot: {
      leave(_: object, { report }: UserContext) {
        for (const [name, scheme] of referencedSchemes.entries()) {
          if (scheme.defined) continue;
          for (const reportedFromLocation of scheme.from) {
            report({
              message: `There is no \`${name}\` security scheme defined.`,
              location: reportedFromLocation.key(),
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
  };
};
