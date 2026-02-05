import { validateExample } from '../utils.js';
import { isDefined } from '../../utils/is-defined.js';
import { isPlainObject } from '../../utils/is-plain-object.js';

import type { UserContext } from '../../walk.js';
import type { Oas3Parameter } from '../../typings/openapi.js';

const context = { apiContext: 'request' as const };

export const NoInvalidParameterExamples: any = (opts: any) => {
  return {
    Parameter: {
      leave(parameter: Oas3Parameter, ctx: UserContext) {
        if (isDefined(parameter.example)) {
          validateExample(
            parameter.example,
            parameter.schema!,
            ctx.location.child('example'),
            ctx,
            !!opts.allowAdditionalProperties,
            context
          );
        }

        if (isPlainObject(parameter.examples)) {
          for (const [key, example] of Object.entries(parameter.examples)) {
            if (isPlainObject(example) && 'value' in example) {
              validateExample(
                example.value,
                parameter.schema!,
                ctx.location.child(['examples', key]),
                ctx,
                !!opts.allowAdditionalProperties,
                context
              );
            }
          }
        }
      },
    },
  };
};
