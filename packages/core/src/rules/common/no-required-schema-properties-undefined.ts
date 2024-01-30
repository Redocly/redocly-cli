import { Oas3Rule } from '../../visitors';
import { Oas3Schema, Oas3_1Schema } from '../../typings/openapi';
import { Oas2Schema } from 'core/src/typings/swagger';
import { UserContext } from 'core/src/walk';

export const NoRequiredSchemaPropertiesUndefined: Oas3Rule = () => {
  return {
    Schema: {
      enter(schema: Oas3Schema | Oas3_1Schema | Oas2Schema, { location, report }: UserContext) {
        schema.required?.forEach((requiredProperty, i) => {
          if (!schema.properties || schema.properties[requiredProperty] === undefined) {
            report({
              message: `Required property '${requiredProperty}' is undefined.`,
              location: location.child(['required', i]),
            });
          }
        });
      },
    },
  };
};
