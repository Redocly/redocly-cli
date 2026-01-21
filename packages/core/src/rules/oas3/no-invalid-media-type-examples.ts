import { isRef } from '../../ref-utils.js';
import { validateExample } from '../utils.js';
import { isDefined } from '../../utils/is-defined.js';

import type { Oas3Rule } from '../../visitors.js';
import type { Location } from '../../ref-utils.js';
import type { Oas3Example } from '../../typings/openapi.js';
import type { UserContext } from '../../walk.js';

export const ValidContentExamples: Oas3Rule = (opts) => {
  return {
    MediaType: {
      skip(mediaType) {
        return !isDefined(mediaType.schema);
      },
      leave(mediaType, ctx: UserContext) {
        const { location, resolve } = ctx;
        const allowAdditionalProperties = isDefined(opts.allowAdditionalProperties)
          ? opts.allowAdditionalProperties
          : false;

        if (isDefined(mediaType.example)) {
          resolveAndValidateExample(mediaType.example, location.child('example'));
        } else if (mediaType.examples) {
          for (const exampleName of Object.keys(mediaType.examples)) {
            resolveAndValidateExample(
              mediaType.examples[exampleName],
              location.child(['examples', exampleName, 'value']),
              true
            );
          }
        }

        function resolveAndValidateExample(
          example: Oas3Example | any,
          location: Location,
          isMultiple?: boolean
        ) {
          if (isRef(example)) {
            const resolved = resolve<Oas3Example>(example);
            if (!resolved.location) return;
            location = isMultiple ? resolved.location.child('value') : resolved.location;
            example = resolved.node;
          }
          if (isMultiple && typeof example?.value === 'undefined') {
            return;
          }
          validateExample(
            isMultiple ? example.value : example,
            mediaType.schema!,
            location,
            ctx,
            allowAdditionalProperties
          );
        }
      },
    },
  };
};
