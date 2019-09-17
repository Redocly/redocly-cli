import createError from '../../error';

export default {
  validators: {
    tokenUrl() {
      return (node, ctx) => {
        if (!node.tokenUrl) return createError('The tokenUrl is required in the Open API Flow Object', node, ctx);
        if (typeof node.tokenUrl !== 'string') return createError('The tokenUrl must be a string in the Open API Flow Object', node, ctx);
        return null;
      };
    },
    refreshUrl() {
      return (node, ctx) => {
        if (node.refreshUrl && typeof node.refreshUrl !== 'string') return createError('The refreshUrl must be a string in the Open API Flow Object', node, ctx);
        return null;
      };
    },
    scopes() {
      return (node, ctx) => {
        const wrongFormatMap = Object.keys(node.scopes)
          .filter((scope) => typeof scope !== 'string' || typeof node.scopes[scope] !== 'string')
          .length > 0;
        if (wrongFormatMap) return createError('The scopes field must be a Map[string, string] in the Open API Flow Object', node, ctx);
        return null;
      };
    },
  },
};
