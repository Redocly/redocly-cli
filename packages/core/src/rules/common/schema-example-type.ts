import { oasTypeOf } from '../utils';
import { UserContext } from '../../walk';
import { validateJsonSchema } from '../ajv';
import { Oas3Schema } from '../../typings/openapi';
import { Location } from '../../ref-utils';

export const SchemaExampleType: any = () => {
  return {
    Schema: {
      leave(schema: Oas3Schema, { report, location, resolve }: UserContext) {
        if (schema.example) {
          try {
            const propValueType = oasTypeOf(schema.example);
            const { valid, errors } = validateJsonSchema(
              schema.example,
              schema,
              location.child('schema'),
              location.child('example').pointer,
              resolve,
              false
            );
            if (!valid) {
              for (let error of errors) {
                report({
                  message: `Expected type \`${schema.type}\` but got \`${propValueType}\`.`,
                  location: {
                    ...new Location(location.child('example').source, error.instancePath),
                  },
                  from: location,
                  suggest: error.suggest,
                });
              }
            }
          } catch(e) {
            report({
              message: `Schema example validation errored: ${e.message}.`,
              location: location.child('schema'),
              from: location
            });
          }
        }
      }
    }
  };
};
