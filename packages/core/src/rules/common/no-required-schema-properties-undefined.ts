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
  const parents: AnySchema[] = [];
  return {
    Schema: {
      leave(_: AnySchema) {
        parents.pop();
      },
      enter(schema: AnySchema, { location, report, resolve }: UserContext) {
        parents.push(schema);
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

        /**
         * The index to use to lookup grand parent schemas when dealing with composed schemas.
         * @summary The current schema should always end up with under ../anyOf/1, if we get multiple ancestors, they should always be a multiple.
         */
        const locationLookupIndex = 2;
        const getParentSchema = (lookupIndex: number): AnySchema | undefined => {
          lookupIndex++;
          if (!parents || parents.length < lookupIndex) return undefined;
          const parent = parents[parents.length - lookupIndex];
          return parent;
        };
        const recursivelyGetParentProperties = (
          splitLocation: string[],
          parentLookupIndex: number = 0
        ): Record<string, AnySchema> | undefined => {
          const isMemberOfComposedType =
            splitLocation.length > locationLookupIndex &&
            !isNaN(parseInt(splitLocation[splitLocation.length - 1])) &&
            !!/(allOf|oneOf|anyOf)/.exec(splitLocation[splitLocation.length - locationLookupIndex]);
          const parentSchema = isMemberOfComposedType
            ? getParentSchema(++parentLookupIndex)
            : undefined;
          const grandParentProperties =
            splitLocation.length >= locationLookupIndex + locationLookupIndex
              ? recursivelyGetParentProperties(
                  splitLocation.slice(0, -locationLookupIndex),
                  parentLookupIndex
                )
              : {};
          return parentSchema
            ? {
                ...elevateProperties(parentSchema, undefined, false),
                ...grandParentProperties,
              }
            : undefined;
        };

        const allProperties = elevateProperties(schema);
        const parentProperties = recursivelyGetParentProperties(location.pointer.split('/'));

        for (const [i, requiredProperty] of schema.required.entries()) {
          if (
            (!allProperties || getOwn(allProperties, requiredProperty) === undefined) &&
            (!parentProperties || getOwn(parentProperties, requiredProperty) === undefined)
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
