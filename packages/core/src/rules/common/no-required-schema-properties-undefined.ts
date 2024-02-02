import { Oas2Rule, Oas3Rule } from '../../visitors';
import { Oas3Schema, Oas3_1Schema } from '../../typings/openapi';
import { Oas2Schema } from 'core/src/typings/swagger';
import { UserContext } from 'core/src/walk';
import { isRef } from '../../ref-utils';

export const NoRequiredSchemaPropertiesUndefined: Oas3Rule | Oas2Rule = () => {
  return {
    Schema: {
      enter(
        schema: Oas3Schema | Oas3_1Schema | Oas2Schema,
        { location, report, resolve }: UserContext
      ) {
        if (!schema.required) return;

        const allProperties = schema.properties ?? {};

        // Skip oneOf/anyOf as it's complicated to validate it right now.
        // We need core support for checking contrstrains through those keywords.
        // Right now we only resolve basic allOf keyword nesting.
        if (schema.allOf) {
          for (const nestedSchema of schema.allOf as Array<
            Oas3Schema | Oas3_1Schema | Oas2Schema
          >) {
            if (isRef(nestedSchema)) {
              const resolved = resolve(nestedSchema).node as Oas3Schema | Oas3_1Schema | Oas2Schema;
              Object.assign(allProperties, resolved.properties);
            } else {
              Object.assign(allProperties, nestedSchema.properties);
            }
          }
        }

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
