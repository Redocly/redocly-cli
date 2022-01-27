import { Oas2Rule } from '../../visitors';

export const ResponseContainsProperty: Oas2Rule = (options) => {
  const mustExist = options.mustExist || [];
  return {
    Response: {
      skip: (_response, key) => {
        return !['200', '201', '202'].includes(key.toString());
      },
      Schema (schema, { report, location }) {
        if (schema.type !== 'object') return;
        for (let element of mustExist) {
          if (!schema.properties?.[element]) {
            report({
              message: `Response object must have a top-level "${element}" property.`,
              location: location.child('properties'),
            });
          }
        }
      }
    }
  }
};
