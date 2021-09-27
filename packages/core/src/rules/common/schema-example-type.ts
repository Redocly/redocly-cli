import { oasTypeOf, matchesJsonSchemaType } from '../utils';
import { UserContext } from '../../walk';

export const SchemaExampleType: any = () => {
  return {
    SchemaProperties(properties: any, { report, location }: UserContext) {
      for (let keyProp in properties) {
        const property = properties[keyProp];
        if (property.example && property.type) {
          const propValueType = oasTypeOf(property.example);
          const isTypeArray = Array.isArray(property.type);
          const checkResult = isTypeArray
            ? property.type.some((type: string) => matchesJsonSchemaType(property.example, type, false))
            : matchesJsonSchemaType(property.example, property.type, false);

          if (!checkResult) {
            report({
              message: `Expected type \`${property.type}\` but got \`${propValueType}\`.`,
              location: location.child([keyProp, 'example']),
            });
          }
        }
      }
    }
  };
};
