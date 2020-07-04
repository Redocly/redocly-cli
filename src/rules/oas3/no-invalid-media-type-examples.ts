import { Oas3Rule } from '../../visitors';
import { validateJsonSchema } from '../ajv';
import { Location, isRef } from '../../ref-utils';
import { Oas3Example } from '../../typings/openapi';

export const ValidContentExamples: Oas3Rule = (opts) => {
  const disallowAdditionalProperties = opts.disallowAdditionalProperties ?? true;

  return {
    MediaType: {
      leave(mediaType, { report, location, resolve }) {
        if (!mediaType.schema) return;

        if (mediaType.example) {
          validateExample(mediaType.example, location.child('example'));
        } else if (mediaType.examples) {
          for (const exampleName of Object.keys(mediaType.examples)) {
            let example = mediaType.examples[exampleName];
            let dataLoc: Location = location.child(['examples', exampleName, 'value']);
            if (isRef(example)) {
              const resolved = resolve<Oas3Example>(example);
              if (!resolved.location) continue;
              dataLoc = resolved.location.child('value');
              example = resolved.node;
            }

            validateExample(example.value, dataLoc);
          }
        }

        function validateExample(example: any, dataLoc: Location) {
          const { valid, errors } = validateJsonSchema(
            example,
            mediaType.schema!,
            location.child('schema'),
            dataLoc.pointer,
            resolve,
            disallowAdditionalProperties
          );
          if (!valid) {
            for (let error of errors) {
              report({
                message: `Example must be valid according to schema: ${error.message}.`,
                location: {
                  ...new Location(dataLoc.source, error.dataPath),
                  reportOnKey: error.keyword === 'additionalProperties',
                },
                from: location,
                suggest: error.suggest,
              });
            }
          }
        }
      },
    },
  };
};
