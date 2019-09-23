import { createErrorMissingRequiredField, createErrrorFieldTypeMismatch } from '../error';

export default {
  validators: {
    propertyName() {
      return (node, ctx) => {
        if (!(node && node.propertyName)) return createErrorMissingRequiredField('propertyName', node, ctx);
        if (typeof node.propertyName !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx);
        return null;
      };
    },
    mapping() {
      return (node, ctx) => {
        if (node && node.mapping && typeof node.mapping !== 'object') return createErrrorFieldTypeMismatch('Map[string, string]', node, ctx);
        if (node && node.mapping && Object.keys(node.mapping).filter((key) => typeof node.mapping[key] !== 'string').length !== 0) return createErrrorFieldTypeMismatch('Map[string, string]', node, ctx);
        return null;
      };
    },
  },
};
