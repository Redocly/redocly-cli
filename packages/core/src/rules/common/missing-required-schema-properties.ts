import { Oas3Rule } from '../../visitors';
import { Oas3Schema, Oas3_1Schema } from '../../typings/openapi';
import { Oas2Schema } from 'core/src/typings/swagger';
import { UserContext } from 'core/src/walk';

export const MissingRequiredSchemaProperties: Oas3Rule = () => {
  return {
    Schema: {
      enter(schema: Oas3Schema | Oas3_1Schema | Oas2Schema, { location, report }: UserContext) {
        if (schema?.required) {
          const missingRequiredProperties: Array<string> = schema.required.filter((property) => {
            return !schema.properties || !Object.keys(schema.properties!).includes(property);
          });

          if (missingRequiredProperties.length) {
            const reportMessage =
              missingRequiredProperties.length > 1
                ? `Properties ${missingRequiredProperties.join(', ')} are required.`
                : `Property ${missingRequiredProperties.join()} is required.`;

            report({
              message: reportMessage,
              location: location.key(),
            });
          }
        }
      },
    },
  };
};
