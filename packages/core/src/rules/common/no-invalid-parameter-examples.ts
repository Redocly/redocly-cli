import { validateExample } from '../utils.js';
import { isDefined } from '../../utils/is-defined.js';

import type { UserContext } from '../../walk.js';
import type { Oas3Parameter } from '../../typings/openapi.js';

export const NoInvalidParameterExamples: any = (opts: any) => {
  return {
    Parameter: {
      leave(parameter: Oas3Parameter, ctx: UserContext) {
        const allowAdditionalProperties = isDefined(opts.allowAdditionalProperties)
          ? opts.allowAdditionalProperties
          : true;
        if (isDefined(parameter.example)) {
          validateExample(
            parameter.example,
            parameter.schema!,
            ctx.location.child('example'),
            ctx,
            allowAdditionalProperties
          );
        }

        if (parameter.examples) {
          for (const [key, example] of Object.entries(parameter.examples)) {
            if ('value' in example) {
              validateExample(
                example.value,
                parameter.schema!,
                ctx.location.child(['examples', key]),
                ctx,
                allowAdditionalProperties
              );
            }
          }
        }
      },
    },
  };
};
