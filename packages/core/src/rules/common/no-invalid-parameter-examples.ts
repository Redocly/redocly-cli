import type { Oas3Parameter } from '../../typings/openapi.js';
import { isDefined } from '../../utils/is-defined.js';
import { isPlainObject } from '../../utils/is-plain-object.js';
import type { Oas2Rule, Oas3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { AjvValidator } from '../ajv.js';
import { validateExample } from '../utils.js';

export const NoInvalidParameterExamples: Oas3Rule | Oas2Rule = (opts) => {
  const validator = new AjvValidator();
  return {
    Parameter: {
      leave(parameter: Oas3Parameter, ctx: UserContext) {
        if (isDefined(parameter.example)) {
          validateExample({
            example: parameter.example,
            schema: parameter.schema!,
            options: {
              location: ctx.location.child('example'),
              ctx,
              validator,
              allowAdditionalProperties: !!opts.allowAdditionalProperties,
              ajvContext: { apiContext: 'request' },
            },
            reference: 'https://redocly.com/docs/cli/rules/oas/no-invalid-parameter-examples',
          });
        }

        if (isPlainObject(parameter.examples)) {
          for (const [key, example] of Object.entries(parameter.examples)) {
            if (isPlainObject(example) && 'value' in example) {
              validateExample({
                example: example.value,
                schema: parameter.schema!,
                options: {
                  location: ctx.location.child(['examples', key]),
                  ctx,
                  validator,
                  allowAdditionalProperties: !!opts.allowAdditionalProperties,
                  ajvContext: { apiContext: 'request' },
                },
                reference: 'https://redocly.com/docs/cli/rules/oas/no-invalid-parameter-examples',
              });
            }
          }
        }
      },
    },
  };
};
