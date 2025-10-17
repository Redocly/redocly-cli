import { isRef } from '../../ref-utils.js';
import { getOwn } from '../../utils/get-own.js';

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
      enter(schema: AnySchema, { location, report, resolve, parents }: UserContext) {
        if (!schema.required) return;
        const visitedSchemas: Set<AnySchema> = new Set();

        const elevateProperties = (
          schema: AnySchema,
          from?: string,
          includeFirstLevelExclusiveSchemas: boolean = true
        ): Record<string, AnySchema> => {
          // Check if the schema has been visited before processing it
          if (visitedSchemas.has(schema)) {
            return {};
          }
          visitedSchemas.add(schema);

          if (isRef(schema)) {
            const resolved = resolve<AnySchema>(schema, from);
            return elevateProperties(
              resolved.node as AnySchema,
              resolved.location?.source.absoluteRef
            );
          }

          return Object.assign(
            {},
            schema.properties,
            ...(schema.allOf?.map((s) => elevateProperties(s, from)) ?? []),
            ...(('anyOf' in schema && includeFirstLevelExclusiveSchemas
              ? schema.anyOf?.map((s) => elevateProperties(s, from))
              : undefined) ?? []),
            ...(('oneOf' in schema && includeFirstLevelExclusiveSchemas
              ? schema.oneOf?.map((s) => elevateProperties(s, from))
              : undefined) ?? [])
          );
        };

        const getGrandParentSchema = (offset: number = 0): AnySchema | undefined => {
          const grandParentIndex = 2 + offset;
          if (!parents || parents.length < grandParentIndex) return undefined;
          const grandParent = parents[parents.length - grandParentIndex];
          return grandParent;
        };
        const recursivelyGetGrandParentProperties = (
          splitLocation: string[],
          offset: number = 0
        ): Record<string, AnySchema> | undefined => {
          const isMemberOfComposedType =
            splitLocation.length > 2 &&
            !isNaN(parseInt(splitLocation[splitLocation.length - 1])) &&
            /(allOf|oneOf|anyOf)/.exec(splitLocation[splitLocation.length - 2]);
          const grandParentSchema = isMemberOfComposedType
            ? getGrandParentSchema(offset)
            : undefined;
          const greatGrandParentProperties =
            splitLocation.length >= 4
              ? recursivelyGetGrandParentProperties(splitLocation.slice(0, -2), offset + 2)
              : {};
          return grandParentSchema
            ? {
                ...elevateProperties(grandParentSchema, undefined, false),
                ...greatGrandParentProperties,
              }
            : undefined;
        };

        const allProperties = elevateProperties(schema);
        const grandParentProperties = recursivelyGetGrandParentProperties(
          location.pointer.split('/')
        );

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
