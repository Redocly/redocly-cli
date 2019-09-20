import createError from '../error';

export const OpenAPIExample = {
  validators: {
    value() {
      return (node, ctx) => {
        if (node.value && node.externalValue) {
          return createError('The value field and externalValue field are mutually exclusive.', node, ctx, 'key');
        }
        return null;
      };
    },
    externalValue() {
      return (node, ctx) => {
        if (node.externalValue && typeof node.externalValue !== 'string') {
          return createError('The externalValue field must be a string', node, ctx);
        }
        if (node.value && node.externalValue) {
          return createError('The value field and externalValue field are mutually exclusive.', node, ctx, 'key');
        }
        return null;
      };
    },
    description() {
      return (node, ctx) => {
        if (node.description && typeof node.description !== 'string') {
          return createError('The description field must be a string', node, ctx);
        }
        return null;
      };
    },
    summary() {
      return (node, ctx) => {
        if (node.summary && typeof node.summary !== 'string') {
          return createError('The summary field must be a string', node, ctx);
        }
        return null;
      };
    },
  },
};

export const OpenAPIExampleMap = {
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIExample;
    });
    return props;
  },
};
