import type { Oas3Parameter } from '../../typings/openapi.js';
import { isDefined } from '../../utils/is-defined.js';
import { isPlainObject } from '../../utils/is-plain-object.js';
import type { UserContext } from '../../walk.js';
import { validateExample } from '../utils.js';

export const NoInvalidParameterExamples: any = (opts: any) => {
  return {
    Parameter: {
      leave(parameter: Oas3Parameter, ctx: UserContext) {
        if (isDefined(parameter.example)) {
          validateExample(parameter.example, parameter.schema!, {
            location: ctx.location.child('example'),
            ctx,
            allowAdditionalProperties: !!opts.allowAdditionalProperties,
            ajvContext: { apiContext: 'request' },
          });
        }

        if (isPlainObject(parameter.examples)) {
          for (const [key, example] of Object.entries(parameter.examples)) {
            if (isPlainObject(example) && 'value' in example) {
              validateExample(example.value, parameter.schema!, {
                location: ctx.location.child(['examples', key]),
                ctx,
                allowAdditionalProperties: !!opts.allowAdditionalProperties,
                ajvContext: { apiContext: 'request' },
              });
            }
          }
        }
      },
    },
  };
};
