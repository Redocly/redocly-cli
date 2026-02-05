import { isRef } from '../../ref-utils.js';
import { validateExample } from '../utils.js';
import { isDefined } from '../../utils/is-defined.js';
import { isPlainObject } from '../../utils/is-plain-object.js';

import type { Oas3Rule } from '../../visitors.js';
import type { Location } from '../../ref-utils.js';
import type { Oas3Example, Oas3MediaType } from '../../typings/openapi.js';
import type { UserContext } from '../../walk.js';
import type { Context as AjvContext } from '@redocly/ajv/dist/2020.js';

export function inferAjvContextFromCtx(ctx: UserContext): AjvContext {
  if (ctx.parentLocations.RequestBody || ctx.parentLocations.Parameter)
    return { apiContext: 'request' };
  if (ctx.parentLocations.Response) return { apiContext: 'response' };
  return {};
}

export const ValidContentExamples: Oas3Rule = (opts) => {
  const skip = (mediaType: Oas3MediaType) => {
    return mediaType.schema === undefined;
  };

  const leave = (mediaType: Oas3MediaType, ctx: UserContext) => {
    const { location, resolve } = ctx;

        if (isDefined(mediaType.example)) {
          resolveAndValidateExample(mediaType.example, location.child('example'));
        } else if (isPlainObject(mediaType.examples)) {
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
        !!opts.allowAdditionalProperties,
        inferAjvContextFromCtx(ctx)
      );
    }
  };

  return {
    RequestBody: {
      MediaType: {
        skip,
        leave,
      },
    },
    Response: {
      MediaType: {
        skip,
        leave,
      },
    },
    Parameter: {
      MediaType: {
        skip,
        leave,
      },
    },
  };
};
