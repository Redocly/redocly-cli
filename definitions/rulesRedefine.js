module.exports = (validators) => ({
  ...validators,
  OpenAPIParameterWithAllOf: {
    validators: {
      ...validators.OpenAPIParameter,
      in: (node, ctx) => {
        if (node.allOf) return null;
        return v.in(node, ctx);
      },
      name: (node, ctx) => {
        if (node.allOf) return null;
        return v.name(node, ctx);
      },
    },
  },
});
