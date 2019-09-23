import createError, { createErrrorFieldTypeMismatch, createErrorMissingRequiredField } from '../error';

const OpenAPIServerVariable = {
  validators: {
    default() {
      return (node, ctx) => {
        if (!node || !node.default) return createErrorMissingRequiredField('default', node, ctx, 'key');
        if (typeof node.default !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx);
        return null;
      };
    },
    description() {
      return (node, ctx) => (node && node.description && typeof node.description !== 'string'
        ? createErrrorFieldTypeMismatch('string', node, ctx) : null);
    },
    enum() {
      return (node, ctx) => {
        if (node && node.enum) {
          if (!Array.isArray(node.enum)) return createErrrorFieldTypeMismatch('array', node, ctx);
          if (node.type && node.enum.filter((item) => typeof item !== 'string').length !== 0) return createError('All values of "enum" field must be strings', node, ctx);
        }
        return null;
      };
    },
  },
};

const OpenAPIServerVariableMap = {
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIServerVariable;
    });
    return props;
  },
};

const OpenAPIServer = {
  validators: {
    url() {
      return (node, ctx) => {
        if (!node || !node.url || typeof node.url !== 'string') return createErrorMissingRequiredField('url', node, ctx);
        if (typeof node.url !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx);
        return null;
      };
    },
    description() {
      return (node, ctx) => (node && node.description && typeof node.description !== 'string'
        ? createErrrorFieldTypeMismatch('string', node, ctx) : null);
    },
  },
  properties: {
    variables() {
      return OpenAPIServerVariableMap;
    },
  },
};

export default OpenAPIServer;
