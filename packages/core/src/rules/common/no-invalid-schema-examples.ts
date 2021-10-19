import { oasTypeOf } from '../utils';
import { UserContext } from '../../walk';
import { validateJsonSchema } from '../ajv';
import { Oas3_1Schema } from '../../typings/openapi';
import { Location } from '../../ref-utils';

export const NoInvalidSchemaExamples: any = () => {
  return {
    Schema: {
      leave(schema: Oas3_1Schema, { report, location, resolve }: UserContext) {
        if (schema.examples) {
          for (const example of schema.examples) {
            validateExample(example, location.child('examples'));
          }
        }
        if (schema.example) {
          validateExample(schema.example, location.child('example'));
        }

        function validateExample(example: any, dataLoc: Location) {
          try {
            const propValueType = oasTypeOf(example);
            const { valid, errors } = validateJsonSchema(
              example,
              schema,
              location.child('schema'),
              dataLoc.pointer,
              resolve,
              false
            );
            if (!valid) {
              for (let error of errors) {
                report({
                  message: `Example value must conform to the schema: ${error.message} but got \`${propValueType}\`.`,
                  location: {
                    ...new Location(dataLoc.source, error.instancePath),
                  },
                  from: location,
                  suggest: error.suggest,
                });
              }
            }
          } catch(e) {
            report({
              message: `Schema example validation errored: ${e.message}.`,
              location: dataLoc,
              from: location
            });
          }
        }
      }
    }
  };
};
