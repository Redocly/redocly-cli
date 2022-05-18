import { UserContext } from '../../walk';
import { Oas3Parameter } from '../../typings/openapi';
import { validateExample } from '../utils';

export const NoInvalidParameterExamples: any = (opts: any) => {
  const disallowAdditionalProperties = opts.disallowAdditionalProperties ?? true;
  return {
    Parameter: {
      leave(parameter: Oas3Parameter, ctx: UserContext) {
        if (parameter.example) {
          validateExample(
            parameter.example,
            parameter.schema!,
            ctx.location.child('example'),
            ctx,
            disallowAdditionalProperties,
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
                false,
              );
            }
          }
        }
      },
    },
  };
};
