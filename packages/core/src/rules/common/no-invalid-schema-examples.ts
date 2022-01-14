import { UserContext } from '../../walk';
import { Oas3_1Schema } from '../../typings/openapi';
import { validateExample } from '../utils';

export const NoInvalidSchemaExamples: any = (opts: any) => {
  const disallowAdditionalProperties = opts.disallowAdditionalProperties ?? true;
  return {
    Schema: {
      leave(schema: Oas3_1Schema, ctx: UserContext) {
        if (schema.examples) {
          for (const example of schema.examples) {
            validateExample(
              example,
              schema,
              ctx.location.child(['examples', schema.examples.indexOf(example)]),
              ctx,
              disallowAdditionalProperties,
            );
          }
        }
        if (schema.example) {
          validateExample(schema.example, schema, ctx.location.child('example'), ctx, false);
        }
      },
    },
  };
};
