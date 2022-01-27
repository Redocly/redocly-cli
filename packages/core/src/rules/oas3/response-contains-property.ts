import { Oas3Rule } from '../../visitors';

export const ResponseContainsProperty: Oas3Rule = (options) => {
  const mustExist = options.mustExist || [];
  return {
    Response: {
      skip: (_response, key) => {
        return !['200', '201', '202'].includes(key.toString());
      },
      MediaType: {
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
  }
};
