import createError from '../error';
import OpenAPIServer from './OpenAPIServer';

export const OpenAPILink = {
  validators: {
    operationRef() {
      return (node, ctx) => {
        if (!node || !node.operationRef) return null;
        if (node.operationRef && node.operationId) return createError('Fields operationRef and operationId are mutually exclusive', node, ctx);
        if (typeof node.operationRef !== 'string') return createError('The operationRef field must be a string in the Open API Link', node, ctx);
        return null;
      };
    },
    operationId() {
      return (node, ctx) => {
        if (!node || !node.operationId) return null;
        if (node.operationRef && node.operationId) return createError('Fields operationId and operationRef are mutually exclusive', node, ctx);
        if (typeof node.operationId !== 'string') return createError('The operationId field must be a string in the Open API Link', node, ctx);
        return null;
      };
    },
    parameters() {
      return (node, ctx) => {
        if (!node || !node.parameters) return null;
        if (Object.keys(node.parameters).filter((key) => typeof key !== 'string').length > 0) {
          return createError('The parameters field must be a Map with string keys', node, ctx);
        }
        return null;
      };
    },
    description() {
      return (node, ctx) => {
        if (!node || !node.description) return null;
        if (typeof node.description !== 'string') {
          return createError('The description field must be a string in the Open API Link', node, ctx);
        }
        return null;
      };
    },
  },
  properties: {
    server: OpenAPIServer,
  },
};

export const OpenAPILinkMap = {
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPILink;
    });
    return props;
  },
};
