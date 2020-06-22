import { Oas3Rule } from '../../visitors';
import { UserContext } from '../../walk';

const checkForProperties = (typeName: string, properties: string[]) => (node: object,  context: UserContext) => {
  for (const requiredProperty of properties) {
    if (!node.hasOwnProperty(requiredProperty)) {
      context.report({
        message: `${typeName} must have ${requiredProperty} property.`,
        location: { reportOnKey: true }
      })
    }
  }
};

export const NoEmptyString: Oas3Rule = (opts: any) => {
  let requiredProperties = new Map<string, string[]>();

  Object.keys(opts).forEach((path: string) => {
    const [ key, property ] = path.split('.');
    if (!requiredProperties.get(key)) requiredProperties.set(key, []);
    requiredProperties.get(key)?.push(property);
  });

  let visitor:any = {};

  for (const [type, properties] of requiredProperties.entries()) {
    visitor[type] = checkForProperties(type, properties);
  }

  return visitor;
};
