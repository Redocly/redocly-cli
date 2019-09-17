import createError from '../error';

export default {
  validators: {
    name() {
      return (node, ctx) => {
        if (node && node.name && typeof node.name !== 'string') return createError('name of the Xml object must be a string', node, ctx);
        return null;
      };
    },
    namespace() {
      return (node, ctx) => {
        // TODO: add validation that format is uri
        if (node && node.namespace && typeof node.namespace !== 'string') return createError('namespace of the Xml object must be a string', node, ctx);
        return null;
      };
    },
    prefix() {
      return (node, ctx) => {
        if (node && node.prefix && typeof node.prefix !== 'string') return createError('prefix of the Xml object must be a string', node, ctx);
        return null;
      };
    },
    attribute() {
      return (node, ctx) => {
        if (node && node.attribute && typeof node.attribute !== 'boolean') return createError('attribute of the Xml object must be a boolean', node, ctx);
        return null;
      };
    },
    wrapped() {
      return (node, ctx) => {
        if (node && node.wrapped && typeof node.wrapped !== 'boolean') return createError('wrapped of the Xml object must be a boolean', node, ctx);
        return null;
      };
    },
  },
};
