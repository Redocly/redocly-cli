import { createErrrorFieldTypeMismatch, createErrorMutuallyExclusiveFields } from '../error';

export const OpenAPIExample = {
  validators: {
    value() {
      return (node, ctx) => {
        if (node.value && node.externalValue) {
          return createErrorMutuallyExclusiveFields(['value', 'externalValue'], node, ctx);
        }
        return null;
      };
    },
    externalValue() {
      return (node, ctx) => {
        if (node.externalValue && typeof node.externalValue !== 'string') {
          return createErrrorFieldTypeMismatch('string', node, ctx);
        }
        if (node.value && node.externalValue) {
          return createErrorMutuallyExclusiveFields(['value', 'externalValue'], node, ctx);
        }
        return null;
      };
    },
    description() {
      return (node, ctx) => {
        if (node.description && typeof node.description !== 'string') {
          return createErrrorFieldTypeMismatch('string', node, ctx);
        }
        return null;
      };
    },
    summary() {
      return (node, ctx) => {
        if (node.summary && typeof node.summary !== 'string') {
          return createErrrorFieldTypeMismatch('string', node, ctx);
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
