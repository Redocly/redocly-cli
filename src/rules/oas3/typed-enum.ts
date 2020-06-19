import { OAS3Rule } from '../../visitors';
import { matchesJsonSchemaType } from '../utils';

export const TypedEnum: OAS3Rule = () => {
  return {
    Schema(schema, { report, location }) {
      if (schema.enum && schema.type) {
        const typeMismatchedValues = schema.enum.filter(
          (item) => !matchesJsonSchemaType(item, schema.type as string),
        );
        for (const error of typeMismatchedValues) {
          report({
            message: 'All values of "enum" field must be of the same type as the "type" field.',
            location: location.append(['enum', schema.enum.indexOf(error)]),
          });
        }
      }
    },
  };
};
