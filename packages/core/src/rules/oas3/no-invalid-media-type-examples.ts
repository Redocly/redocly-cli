import type { Context as AjvContext } from '@redocly/ajv/dist/2020.js';

import { isRef, type Location } from '../../ref-utils.js';
import type { Oas3Example, Oas3MediaType } from '../../typings/openapi.js';
import { isDefined } from '../../utils/is-defined.js';
import { isPlainObject } from '../../utils/is-plain-object.js';
import type { Oas3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { AjvValidator } from '../ajv.js';
import { validateExample } from '../utils.js';

export const ValidContentExamples: Oas3Rule = (opts) => {
  const validator = new AjvValidator();

  const skip = (mediaType: Oas3MediaType) => {
    return mediaType.schema === undefined;
  };

  const leave = (context: AjvContext) => (mediaType: Oas3MediaType, ctx: UserContext) => {
    const { location, resolve } = ctx;

    if (isDefined(mediaType.example)) {
      const example = resolveExample(mediaType.example, location.child('example'));
      if (example.location) {
        validate(example.node, example.location);
      }
    } else if (isPlainObject(mediaType.examples)) {
      for (const [exampleName, example] of Object.entries(mediaType.examples)) {
        const resolved = resolveExample(example, location.child(['examples', exampleName]));
        if (!resolved.location || !isPlainObject<Oas3Example>(resolved.node)) continue;
        for (const field of ['value', 'dataValue'] as const) {
          if (isDefined(resolved.node[field])) {
            validate(resolved.node[field], resolved.location.child(field));
          }
        }
      }
    }

    function resolveExample(example: unknown, exampleLocation: Location) {
      return isRef(example)
        ? resolve<Oas3Example>(example)
        : { node: example, location: exampleLocation };
    }

    function validate(example: unknown, exampleLocation: Location) {
      validateExample({
        example,
        schema: mediaType.schema!,
        options: {
          location: exampleLocation,
          ctx,
          validator,
          allowAdditionalProperties: !!opts.allowAdditionalProperties,
          ajvContext: context,
        },
        reference: 'https://redocly.com/docs/cli/rules/oas/no-invalid-media-type-examples',
      });
    }
  };

  return {
    Parameter: {
      MediaType: {
        skip,
        leave: leave({ apiContext: 'request' }),
      },
    },
    RequestBody: {
      MediaType: {
        skip,
        leave: leave({ apiContext: 'request' }),
      },
    },
    Response: {
      MediaType: {
        skip,
        leave: leave({ apiContext: 'response' }),
      },
    },
  };
};
