import type { Oas3Schema } from '../../typings/openapi.js';
import type { Oas2Schema } from '../../typings/swagger.js';
import { isPlainObject } from '../../utils/is-plain-object.js';
import type { Oas3Rule, Oas2Rule, Async3Rule, Async2Rule, Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { matchesJsonSchemaType, oasTypeOf } from '../utils.js';

export const NoEnumTypeMismatch:
  | Oas3Rule
  | Oas2Rule
  | Async3Rule
  | Async2Rule
  | Arazzo1Rule = () => {
  return {
    Schema(schema: Oas2Schema | Oas3Schema, { report, location }: UserContext) {
      // the walker also visits boolean schemas (valid since OAS 3.1), which have nothing to check
      if (!isPlainObject(schema) || !schema.type) return;

      const types = Array.isArray(schema.type) ? schema.type : [schema.type];
      const matchesAnyType = (value: unknown) =>
        types.some((type) => matchesJsonSchemaType(value, type, schema.nullable as boolean));

      if (Array.isArray(schema.enum)) {
        for (const [index, enumValue] of schema.enum.entries()) {
          if (matchesAnyType(enumValue)) continue;

          report({
            message: Array.isArray(schema.type)
              ? `Enum value \`${enumValue}\` must be of allowed types: \`${schema.type}\`.`
              : `All values of \`enum\` field must be of the same type as the \`type\` field: expected "${
                  schema.type
                }" but received "${oasTypeOf(enumValue)}".`,
            location: location.child(['enum', index]),
            reference: 'https://redocly.com/docs/cli/rules/common/no-enum-type-mismatch',
          });
        }
      }

      if ('const' in schema && !matchesAnyType(schema.const)) {
        report({
          message: `The \`const\` value must be of the same type as the \`type\` field: expected "${types.join(
            '" or "'
          )}" but received "${oasTypeOf(schema.const)}".`,
          location: location.child(['const']),
          reference: 'https://redocly.com/docs/cli/rules/common/no-enum-type-mismatch',
        });
      }
    },
  };
};
