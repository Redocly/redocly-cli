import OpenAPIExternalDocumentation from './OpenAPIExternalDocumentation';
import createError from '../error';

export default {
  validators: {
    name() {
      return (node, ctx) => {
        if (!node.name) return createError('The name property is required for the Open API Tag object', node, ctx);
        if (node && node.name && typeof node.name !== 'string') {
          return createError('The name field must be a string', node, ctx);
        }
        return null;
      };
    },
    description() {
      return (node, ctx) => {
        if (node && node.description && typeof node.description !== 'string') {
          return createError('The description field must be a string', node, ctx);
        }
        return null;
      };
    },
  },
  properties: {
    externalDocs: OpenAPIExternalDocumentation,
  },
};
