module.exports = {
  OpenAPIParameter: {
    validators: (v) => () => ({
      ...v,
      in: (node, ctx) => {
        if (node.allOf) return null;
        return v.in(node, ctx);
      },
      name: (node, ctx) => {
        if (node.allOf) return null;
        return v.name(node, ctx);
      },
    }),
  },
};
