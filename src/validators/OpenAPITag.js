import OpenAPIExternalDocumentation from './OpenAPIExternalDocumentation';
import { createErrorMissingRequiredField, createErrrorFieldTypeMismatch } from '../error';

export default {
  validators: {
    name() {
      return (node, ctx) => {
        if (!node.name) return createErrorMissingRequiredField('name', node, ctx);
        if (node && node.name && typeof node.name !== 'string') {
          return createErrrorFieldTypeMismatch('string', node, ctx);
        }
        return null;
      };
    },
    description() {
      return (node, ctx) => {
        if (node && node.description && typeof node.description !== 'string') {
          return createErrrorFieldTypeMismatch('string', node, ctx);
        }
        return null;
      };
    },
  },
  properties: {
    externalDocs: OpenAPIExternalDocumentation,
  },
};
