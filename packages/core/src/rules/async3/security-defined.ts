import { isRef } from '../../ref-utils.js';
import type { Location } from '../../ref-utils.js';
import type { Async3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

const COMPONENT_SCHEME_PREFIX = '#/components/securitySchemes/';

export const SecurityDefined: Async3Rule = () => {
  const referencedSchemes = new Map<
    string,
    {
      defined?: boolean;
      from: Location[];
    }
  >();
  const invalidRefLocations: Location[] = [];
  const operationsWithoutSecurity: Location[] = [];
  let eachOperationHasSecurity = true;

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

        for (const location of invalidRefLocations) {
          report({
            message: `Security scheme \`$ref\` must point to \`#/components/securitySchemes\`.`,
            location: location.key(),
          });
        }

        if (!eachOperationHasSecurity) {
          for (const operationLocation of operationsWithoutSecurity) {
            report({
              message: `Every operation should have security defined on it.`,
              location: operationLocation.key(),
            });
          }
        }
      },
    },
    NamedSecuritySchemes: {
      SecurityScheme(_scheme: unknown, { key }: UserContext) {
        const name = key.toString();
        const existing = referencedSchemes.get(name);
        if (existing) {
          existing.defined = true;
        } else {
          referencedSchemes.set(name, { defined: true, from: [] });
        }
      },
    },
    SecuritySchemeList: {
      enter(list: unknown[] | undefined, { location }: UserContext) {
        if (!list) return;
        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          if (!isRef(item)) continue;
          const itemLocation = location.child([i]);
          const ref = item.$ref;
          if (!ref.startsWith(COMPONENT_SCHEME_PREFIX)) {
            invalidRefLocations.push(itemLocation);
            continue;
          }
          const name = ref.slice(COMPONENT_SCHEME_PREFIX.length);
          const existing = referencedSchemes.get(name);
          if (existing) {
            existing.from.push(itemLocation);
          } else {
            referencedSchemes.set(name, { from: [itemLocation] });
          }
        }
      },
    },
    Operation(operation: { security?: unknown }, { location }: UserContext) {
      if (!operation?.security) {
        eachOperationHasSecurity = false;
        operationsWithoutSecurity.push(location);
      }
    },
  };
};
