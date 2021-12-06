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
          validateExample(
            mediaType.example,
            mediaType.schema,
            location.child('example'),
            ctx,
            disallowAdditionalProperties,
          );
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
            validateExample(
              example.value,
              mediaType.schema,
              dataLoc,
              ctx,
              disallowAdditionalProperties,
            );
          }
        }
      },
    },
  };
};
