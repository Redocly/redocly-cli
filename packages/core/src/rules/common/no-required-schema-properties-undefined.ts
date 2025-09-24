import { isRef } from '../../ref-utils.js';
import { getOwn } from '../../utils.js';

import type { Async2Rule, Async3Rule, Arazzo1Rule, Oas2Rule, Oas3Rule } from '../../visitors.js';
import type { Oas3Schema, Oas3_1Schema } from '../../typings/openapi.js';
import type { Oas2Schema } from '../../typings/swagger.js';
import type { UserContext } from '../../walk.js';

type AnySchema = Oas3Schema | Oas3_1Schema | Oas2Schema;

export const NoRequiredSchemaPropertiesUndefined:
  | Oas3Rule
  | Oas2Rule
  | Async3Rule
  | Async2Rule
  | Arazzo1Rule = () => {
  return {
    Schema: {
      enter(schema: anyVersionSchema, { location, report, resolve, parents }: UserContext) {
        if (!schema.required) return;
        const visitedSchemas: Set<anyVersionSchema> = new Set();

        const elevateProperties = (
          schema: anyVersionSchema,
          from?: string
        ): Record<string, anyVersionSchema> => {
          // Check if the schema has been visited before processing it
          if (visitedSchemas.has(schema)) {
            return {};
          }
          visitedSchemas.add(schema);

          if (isRef(schema)) {
            const resolved = resolve<anyVersionSchema>(schema, from);
            return elevateProperties(
              resolved.node as anyVersionSchema,
              resolved.location?.source.absoluteRef
            );
          }

          return Object.assign(
            {},
            schema.properties,
            ...(schema.allOf?.map((s) => elevateProperties(s, from)) ?? []),
            ...((schema as Oas3Schema).anyOf?.map((s) => elevateProperties(s, from)) ?? []),
            ...((schema as Oas3Schema).oneOf?.map((s) => elevateProperties(s, from)) ?? [])
          );
        };

        const getGrandParentSchema = (): anyVersionSchema | undefined => {
          if (!parents || parents.length < 2) return undefined;
          const grandParent = parents[parents.length - 2];
          return grandParent;
        };

        const allProperties = elevateProperties(schema);
        const grandParentSchema = getGrandParentSchema();
        const grandParentProperties = grandParentSchema
          ? elevateProperties(grandParentSchema)
          : undefined;

        for (const [i, requiredProperty] of schema.required.entries()) {
          if (
            (!allProperties || getOwn(allProperties, requiredProperty) === undefined) &&
            (!grandParentProperties ||
              getOwn(grandParentProperties, requiredProperty) === undefined)
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
