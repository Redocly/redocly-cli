import { validateExample } from '../utils.js';
import { isDefined } from '../../utils/is-defined.js';

import type { UserContext } from '../../walk.js';
import type { Oas3_1Schema, Oas3Schema } from '../../typings/openapi.js';
import type { Oas2Rule, Oas3Rule } from '../../visitors.js';

const context = {};

export const NoInvalidSchemaExamples: Oas3Rule | Oas2Rule = (opts: any) => {
  return {
    Schema: {
      leave(schema: Oas3_1Schema | Oas3Schema, ctx: UserContext) {
        const examples = (schema as Oas3_1Schema).examples;

        if (Array.isArray(examples)) {
          for (const example of examples) {
            validateExample(example, schema, {
              dataLoc: ctx.location.child(['examples', examples.indexOf(example)]),
              ctx,
              allowAdditionalProperties: !!opts.allowAdditionalProperties,
              ajvContext: context,
            });
          }
        }

        if (isDefined(schema.example)) {
          // Handle nullable example for OAS3
          if (
            (schema as Oas3Schema).nullable === true &&
            schema.example === null &&
            schema.type !== undefined
          ) {
            return;
          }

          validateExample(schema.example, schema, {
            dataLoc: ctx.location.child('example'),
            ctx,
            allowAdditionalProperties: !!opts.allowAdditionalProperties,
            ajvContext: context,
          });
        }
      },
    },
  };
};
