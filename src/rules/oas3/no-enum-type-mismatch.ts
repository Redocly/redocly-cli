import { Oas3Rule } from '../../visitors';
import { matchesJsonSchemaType, oasTypeOf } from '../utils';

export const NoEnumTypeMismatch: Oas3Rule = () => {
  return {
    Schema(schema, { report, location }) {
      if (schema.enum && schema.type) {
        const typeMismatchedValues = schema.enum.filter(
          (item) => !matchesJsonSchemaType(item, schema.type as string),
        );
        for (const mismatchedValue of typeMismatchedValues) {
          report({
            message: `All values of \`enum\` field must be of the same type as the \`type\` field: expected "${
              schema.type
            }" but received "${oasTypeOf(mismatchedValue)}"`,
            location: location.child(['enum', schema.enum.indexOf(mismatchedValue)]),
          });
        }
      }
    },
  };
};
