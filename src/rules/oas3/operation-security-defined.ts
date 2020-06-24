import { Oas3Rule } from '../../visitors';
import { Location } from '../../ref-utils';

export const OperationSecurityDefined: Oas3Rule = () => {
  let referencedSchemes = new Map<
    string,
    {
      defined?: boolean;
      from: Location[];
    }
  >();

  return {
    DefinitionRoot: {
      leave(_root, { report }) {
        for (const [name, scheme] of referencedSchemes.entries()) {
          if (scheme.defined) continue;
          for (const reportedFromLocation of scheme.from) {
            report({
              message: `There is no "${name}" security scheme defined.`,
              location: reportedFromLocation.key(),
            });
          }
        }
      },
    },
    SecurityScheme(_securityScheme, { key }) {
      referencedSchemes.set(key.toString(), {
        defined: true,
        from: [],
      });
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
