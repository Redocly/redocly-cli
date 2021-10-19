import { oasTypeOf } from '../utils';
import { UserContext } from '../../walk';
import { validateJsonSchema } from '../ajv';
import { Location } from '../../ref-utils';
import { Oas3Parameter } from '../../typings/openapi';

export const NoInvalidParameterExamples: any = () => {
  return {
    Parameter: {
      leave(parameter: Oas3Parameter, { report, location, resolve }: UserContext) {
        if (parameter.example) {
          validateExample(parameter.example, location.child('example'));
        }

        if (parameter.examples) {
          for (const [_key, example] of Object.entries(parameter.examples)) {
            validateExample(example, location.child('examples'));
          }
        }

        function validateExample(example: any, dataLoc: Location) {
          try {
            const propValueType = oasTypeOf(example);
            const { valid, errors } = validateJsonSchema(
              example,
              parameter.schema,
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
