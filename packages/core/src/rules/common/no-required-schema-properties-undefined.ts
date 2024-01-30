import { Oas3Rule } from '../../visitors';
import { Oas3Schema, Oas3_1Schema } from '../../typings/openapi';
import { Oas2Schema } from 'core/src/typings/swagger';
import { UserContext } from 'core/src/walk';

export const NoRequiredSchemaPropertiesUndefined: Oas3Rule = () => {
  return {
    Schema: {
      enter(schema: Oas3Schema | Oas3_1Schema | Oas2Schema, { location, report }: UserContext) {
        if (schema?.required) {
          const missingRequiredProperties: string[] = schema.required.filter((property) => {
            return !schema.properties || schema.properties[property] === undefined;
          });

          if (missingRequiredProperties.length) {
            const reportMessage =
              missingRequiredProperties.length > 1
                ? `Required properties are undefined: ${missingRequiredProperties.join(', ')}.`
                : `Required property ${missingRequiredProperties.join()} is undefined.`;

            report({
              message: reportMessage,
              location: location.child('required'),
            });
          }
        }
      },
    },
  };
};
