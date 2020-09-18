import { Oas3Rule } from '../../visitors';
import { UserContext } from '../../walk';
import { Oas3Discriminator} from '../../typings/openapi';

export const NoDiscriminatorPropertyInObject: Oas3Rule = () => {
  return {
    Schema: {
      Discriminator(discriminator: Oas3Discriminator, { report, location }: UserContext,  parent) {
        const { propertyName } = discriminator;
        const { properties } = parent.Schema;
        const schemaName = parent.Schema.xml.name;
        if (!(propertyName in properties)) {
          report({
            message: `The discriminator property ${propertyName} must exist in schema: ${schemaName}`,
            location: location.key(),
          });
        }
      }
    }
  }
};