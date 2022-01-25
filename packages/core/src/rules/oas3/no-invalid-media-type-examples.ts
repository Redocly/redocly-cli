import { Oas3Rule } from '../../visitors';
import { Location, isRef } from '../../ref-utils';
import { Oas3Example } from '../../typings/openapi';
import { validateExample } from '../utils';
import { UserContext } from '../../walk';

export const ValidContentExamples: Oas3Rule = (opts) => {
  const disallowAdditionalProperties = opts.disallowAdditionalProperties ?? true;

  return {
    MediaType: {
      leave(mediaType, ctx: UserContext) {
        const { location, resolve } = ctx;
        if (!mediaType.schema) return;
        if (mediaType.example) {
         resolveAndValidateExample(mediaType.example, location.child('example'));
        } else if (mediaType.examples) {
          for (const exampleName of Object.keys(mediaType.examples)) {
            resolveAndValidateExample(mediaType.examples[exampleName], location.child(['examples', exampleName, 'value']));
          }
        }

        function resolveAndValidateExample(example: Oas3Example | any, location: Location) {
          if (isRef(example)) {
            const resolved = resolve<Oas3Example>(example);
            if (!resolved.location) return;
            location = resolved.location.child('value');
            example = resolved.node;
          }
          validateExample(
            example.value ?? example,
            mediaType.schema!,
            location,
            ctx,
            disallowAdditionalProperties,
          );
        }
      },
    },
  };
};
