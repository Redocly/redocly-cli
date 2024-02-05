import { Oas2Rule, Oas3Rule } from '../../visitors';
import { Oas3Schema, Oas3_1Schema } from '../../typings/openapi';
import { Oas2Schema } from 'core/src/typings/swagger';
import { UserContext } from 'core/src/walk';
import { isRef } from '../../ref-utils';

export const NoRequiredSchemaPropertiesUndefined: Oas3Rule | Oas2Rule = () => {
  const processNestedSchemasRecursively = (
    schema: Oas3Schema | Oas3_1Schema | Oas2Schema,
    { resolve }: UserContext,
    allProperties: Record<string, Oas3Schema | Oas3_1Schema | Oas2Schema>,
    visitedSchemas: Set<Oas3Schema | Oas3_1Schema | Oas2Schema>
  ) => {
    // Skip oneOf/anyOf as it's complicated to validate it right now.
    // We need core support for checking constraints through those keywords.
    // Right now we only resolve allOf keyword nesting.
    if (schema.allOf) {
      // Check if the schema has been visited before processing it
      if (visitedSchemas.has(schema)) {
        return;
      }

      // Add the schema to the visited set to avoid circular references
      visitedSchemas.add(schema);

      for (const nestedSchema of schema.allOf) {
        if (isRef(nestedSchema)) {
          const resolved = resolve(nestedSchema).node as Oas3Schema | Oas3_1Schema | Oas2Schema;
          Object.assign(allProperties, resolved.properties);
          processNestedSchemasRecursively(
            resolved,
            { resolve } as UserContext,
            allProperties,
            visitedSchemas
          );
        } else {
          Object.assign(allProperties, nestedSchema.properties || {});
          processNestedSchemasRecursively(
            nestedSchema,
            { resolve } as UserContext,
            allProperties,
            visitedSchemas
          );
        }
      }
    }
  };

  return {
    Schema: {
      enter(
        schema: Oas3Schema | Oas3_1Schema | Oas2Schema,
        { location, report, resolve }: UserContext
      ) {
        if (!schema.required) return;

        const allProperties: Record<string, Oas3Schema | Oas3_1Schema | Oas2Schema> = {};
        const visitedSchemas: Set<Oas3Schema | Oas3_1Schema | Oas2Schema> = new Set();

        if (schema.properties) {
          Object.assign(allProperties, schema.properties);
        }

        processNestedSchemasRecursively(
          schema,
          { resolve } as UserContext,
          allProperties,
          visitedSchemas
        );

        for (const [i, requiredProperty] of schema.required.entries()) {
          if (!allProperties || allProperties[requiredProperty] === undefined) {
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
