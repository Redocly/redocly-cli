import { createErrrorFieldTypeMismatch } from '../error';

export default {
  validators: {
    name() {
      return (node, ctx) => {
        if (node && node.name && typeof node.name !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx);
        return null;
      };
    },
    namespace() {
      return (node, ctx) => {
        // TODO: add validation that format is uri
        if (node && node.namespace && typeof node.namespace !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx);
        return null;
      };
    },
    prefix() {
      return (node, ctx) => {
        if (node && node.prefix && typeof node.prefix !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx);
        return null;
      };
    },
    attribute() {
      return (node, ctx) => {
        if (node && node.attribute && typeof node.attribute !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx);
        return null;
      };
    },
    wrapped() {
      return (node, ctx) => {
        if (node && node.wrapped && typeof node.wrapped !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx);
        return null;
      };
    },
  },
};
