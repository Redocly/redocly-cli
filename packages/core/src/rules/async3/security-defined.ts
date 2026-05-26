import { isRef } from '../../ref-utils.js';
import type { Location } from '../../ref-utils.js';
import type { Async3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

type SecurityReference = {
  location: Location;
  name: string;
  resolvedAbsolutePointer?: string;
  resolved: boolean;
};

export const SecurityDefined: Async3Rule = () => {
  const definedSchemeAbsolutePointers = new Set<string>();
  const references: SecurityReference[] = [];
  const operationsWithoutSecurity: Location[] = [];
  let eachOperationHasSecurity = true;

  return {
    Root: {
      leave(_root: unknown, { report }: UserContext) {
        for (const reference of references) {
          if (
            reference.resolved &&
            reference.resolvedAbsolutePointer &&
            definedSchemeAbsolutePointers.has(reference.resolvedAbsolutePointer)
          ) {
            continue;
          }

          if (!reference.resolved) {
            report({
              message: `There is no \`${reference.name}\` security scheme defined.`,
              location: reference.location.key(),
            });
          } else {
            report({
              message: `Security scheme \`$ref\` must point to \`#/components/securitySchemes\`.`,
              location: reference.location.key(),
            });
          }
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
      SecurityScheme(_scheme: unknown, { location }: UserContext) {
        definedSchemeAbsolutePointers.add(location.absolutePointer.toString());
      },
    },
    SecuritySchemeList: {
      enter(list: unknown[] | undefined, { location, resolve }: UserContext) {
        if (!list) return;
        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          if (!isRef(item)) continue;
          const itemLocation = location.child([i]);
          const resolved = resolve(item);
          const name = item.$ref.split('/').pop() ?? item.$ref;
          references.push({
            location: itemLocation,
            name,
            resolvedAbsolutePointer: resolved.location?.absolutePointer.toString(),
            resolved: resolved.node !== undefined,
          });
        }
      },
    },
    Operation(operation: { security?: unknown; traits?: unknown[] },
      { location, resolve }: UserContext
    ) {
      if (operationHasSecurity(operation, resolve)) return;
      eachOperationHasSecurity = false;
      operationsWithoutSecurity.push(location);
    },
  };
};

function operationHasSecurity(
  operation: { security?: unknown; traits?: unknown[] } | undefined,
  resolve: UserContext['resolve']
): boolean {
  if (operation?.security) return true;
  if (!Array.isArray(operation?.traits)) return false;
  for (const trait of operation.traits) {
    const traitNode = isRef(trait) ? resolve(trait).node : trait;
    if ((traitNode as { security?: unknown } | undefined)?.security) return true;
  }
  return false;
}
