import type { Oas3Schema, Oas3_1Schema } from '../../typings/openapi.js';
import type { Oas2Schema } from '../../typings/swagger.js';
import { getOwn } from '../../utils/get-own.js';
import { isNotEmptyArray } from '../../utils/is-not-empty-array.js';
import type { Async2Rule, Async3Rule, Arazzo1Rule, Oas2Rule, Oas3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { resolveSchema } from '../utils.js';

type AnySchema =
  | Oas3Schema
  | Oas3_1Schema
  | (Oas2Schema & { anyOf?: undefined; oneOf?: undefined });

export const NoRequiredSchemaPropertiesUndefined:
  | Oas3Rule
  | Oas2Rule
  | Async3Rule
  | Async2Rule
  | Arazzo1Rule = () => {
  const parents: AnySchema[] = [];
  return {
    Schema: {
      leave(_: AnySchema) {
        parents.pop();
      },
      enter(currentSchema: AnySchema, ctx: UserContext) {
        parents.push(currentSchema);
        if (!currentSchema.required) return;

        const hasProperty = (
          schemaOrRef: AnySchema | undefined,
          propertyName: string,
          visited: Set<AnySchema>,
          resolveFrom?: string
        ): boolean => {
          const { schema, location } = resolveSchema(schemaOrRef, ctx, resolveFrom);
          if (!schema || visited.has(schema)) return false;
          visited.add(schema);

          if (schema.properties && getOwn(schema.properties, propertyName) !== undefined) {
            return true;
          }

          if (schema.allOf?.some((s) => hasProperty(s, propertyName, visited, location))) {
            return true;
          }

          if (
            isNotEmptyArray<AnySchema>(schema.anyOf) &&
            schema.anyOf.every((s) => hasProperty(s, propertyName, new Set(visited), location))
          ) {
            return true;
          }

          if (
            isNotEmptyArray<AnySchema>(schema.oneOf) &&
            schema.oneOf.every((s) => hasProperty(s, propertyName, new Set(visited), location))
          ) {
            return true;
          }

          return false;
        };

        const isCompositionChild = (parent: AnySchema, child: AnySchema): boolean => {
          const matchesChild = (s: AnySchema) => resolveSchema(s, ctx).schema === child;
          return !!(
            parent.allOf?.some(matchesChild) ||
            parent.anyOf?.some(matchesChild) ||
            parent.oneOf?.some(matchesChild)
          );
        };

        const findCompositionRoot = (i: number, child: AnySchema): AnySchema | undefined => {
          if (i < 0) return undefined;
          const parent = parents[i];
          return isCompositionChild(parent, child)
            ? (findCompositionRoot(i - 1, parent) ?? parent)
            : undefined;
        };

        const compositionRoot = findCompositionRoot(parents.length - 2, currentSchema);

        for (const [i, requiredProperty] of currentSchema.required.entries()) {
          if (
            !hasProperty(currentSchema, requiredProperty, new Set()) &&
            !hasProperty(compositionRoot, requiredProperty, new Set())
          ) {
            ctx.report({
              message: `Required property '${requiredProperty}' is not defined.`,
              location: ctx.location.child(['required', i]),
            });
          }
        }
      },
    },
  };
};
