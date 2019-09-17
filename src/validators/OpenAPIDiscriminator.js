import createError from '../error';

export default {
  validators: {
    propertyName() {
      return (node, ctx) => {
        if (!(node && node.propertyName)) return createError('propertyName field is required for Discriminator object', node, ctx);
        if (typeof node.propertyName !== 'string') return createError('propertyName of the Discriminator must be a string', node, ctx);
        return null;
      };
    },
    mapping() {
      return (node, ctx) => {
        if (node && node.mapping && typeof node.mapping !== 'object') return createError('mapping must be a [string, string] object', node, ctx);
        if (node && node.mapping && Object.keys(node.mapping).filter((key) => typeof node.mapping[key] !== 'string').length !== 0) return createError('mapping must be a [string, string] object', node, ctx);
        return null;
      };
    },
  },

};
