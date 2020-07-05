import { Oas3Rule, Oas2Rule } from '../../visitors';
import { matchesJsonSchemaType, oasTypeOf } from '../utils';
import { Oas2Schema } from '../../typings/swagger';
import { Oas3Schema } from '../../typings/openapi';
import { UserContext } from '../../walk';

export const NoEnumTypeMismatch: (Oas3Rule | Oas2Rule) = () => {
  return {
    Schema(schema: Oas2Schema | Oas3Schema, { report, location }: UserContext) {
      if (schema.enum && schema.type) {
        const typeMismatchedValues = schema.enum.filter(
          (item) => !matchesJsonSchemaType(item, schema.type as string),
        );
        for (const mismatchedValue of typeMismatchedValues) {
          report({
            message: `All values of \`enum\` field must be of the same type as the \`type\` field: expected "${
              schema.type
            }" but received "${oasTypeOf(mismatchedValue)}".`,
            location: location.child(['enum', schema.enum.indexOf(mismatchedValue)]),
          });
        }
      }
    },
  };
};
