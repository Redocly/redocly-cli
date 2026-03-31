import type { Oas3Schema, Oas3_1Schema } from '../../typings/openapi.js';
import type { Oas2Schema } from '../../typings/swagger.js';
import { getOwn } from '../../utils/get-own.js';
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
      enter(schema: AnySchema, ctx: UserContext) {
        const { location, report } = ctx;
        parents.push(schema);
        if (!schema.required) return;

        const hasProperty = (
          schemaOrRef: AnySchema | undefined,
          propertyName: string,
          visited: Set<AnySchema>,
          resolveFrom?: string
        ): boolean => {
          const resolved = resolveSchema(schemaOrRef, ctx, resolveFrom);
          if (!resolved.schema || visited.has(resolved.schema)) return false;
          visited.add(resolved.schema);

          if (
            (resolved.schema.properties &&
              getOwn(resolved.schema.properties, propertyName) !== undefined) ||
            resolved.schema.allOf?.some((s) =>
              hasProperty(s, propertyName, visited, resolved.location)
            ) ||
            resolved.schema.anyOf?.every((s) =>
              hasProperty(s, propertyName, visited, resolved.location)
            ) ||
            resolved.schema.oneOf?.every((s) =>
              hasProperty(s, propertyName, visited, resolved.location)
            )
          ) {
            return true;
          }

          return false;
        };

        const isCompositionChild = (parent: AnySchema, child: AnySchema): boolean => {
          const matches = (s: AnySchema) => resolveSchema(s, ctx).schema === child;
          return !!(
            parent.allOf?.some(matches) ||
            parent.anyOf?.some(matches) ||
            parent.oneOf?.some(matches)
          );
        };

        const findCompositionRoot = (): AnySchema | undefined => {
          let root: AnySchema | undefined;
          let child = schema;
          for (let i = parents.length - 2; i >= 0; i--) {
            const parent = parents[i];
            if (isCompositionChild(parent, child)) {
              root = parent;
              child = parent;
            } else {
              break;
            }
          }
          return root;
        };

        const compositionRoot = findCompositionRoot();

        for (const [i, requiredProperty] of schema.required.entries()) {
          if (
            !hasProperty(schema, requiredProperty, new Set()) &&
            !(compositionRoot && hasProperty(compositionRoot, requiredProperty, new Set()))
          ) {
            report({
              message: `Required property '${requiredProperty}' is undefined.`,
              location: location.child(['required', i]),
            });
          }
        }
      },
    },
  };
};
