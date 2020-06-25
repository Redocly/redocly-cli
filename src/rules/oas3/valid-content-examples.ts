import { Oas3Rule } from '../../visitors';
import { validateSchema } from '../ajv';
import { Location, isRef } from '../../ref-utils';
import { Oas3Example } from '../../typings/openapi';

export const ValidContentExamples: Oas3Rule = () => {
  return {
    MediaType(mediaType, { report, location, resolve, oasVersion }) {
      if (!mediaType.schema) return;

      if (mediaType.example) {
        const res = validateSchema(
          mediaType.example,
          mediaType.schema,
          location.child('example'),
          resolve,
          oasVersion,
        );
        if (!res.valid) {
          report({
            message: `Example must be valid according to schema: ${res.error.message}`,
            location: new Location(location.source, res.error.dataPath),
          });
        }
      } else if (mediaType.examples) {
        for (const exampleName of Object.keys(mediaType.examples)) {
          const example = mediaType.examples[exampleName];
          let resolvedExample: Oas3Example;
          let newLocation;
          if (isRef(example)) {
            const res = resolve<Oas3Example>(example);
            if (!res.location) continue;
            newLocation = res.location.child('value');
            resolvedExample = res.node;
          } else {
            newLocation = location.child(['examples', exampleName, 'value']);
            resolvedExample = example;
          }

          const res = validateSchema(
            resolvedExample.value,
            mediaType.schema,
            newLocation,
            resolve,
          );
          if (!res.valid) {
            report({
              message: `Example must be valid according to schema: ${res.error.message}`,
              location: new Location(newLocation.source, res.error.dataPath),
            });
          }
        }
      }
    },
  };
};
