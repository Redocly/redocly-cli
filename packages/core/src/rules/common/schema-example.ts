import { oasTypeOf, matchesJsonSchemaType } from '../utils';
import { UserContext } from '../../walk';

export const SchemaExample: any = () => {
  return {
    SchemaProperties(properties: any, { report, location }: UserContext) {
      for (let keyProp in properties) {
        const property = properties[keyProp];
        if (property.example) {
          const propValueType = oasTypeOf(property.example);
          if (!matchesJsonSchemaType(property.example, property.type, false)) {
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
