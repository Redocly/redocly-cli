const validateNode = (node, ctx, name) => {
  const names = Object.keys(node);
  for (let i = 0; i < names.length; i++) {
    if (names[i].indexOf('_') > 0) {
      ctx.path.push(names[i]);
      ctx.report({
        message: `${name}'s names should be in camelCase.`,
        reportOnKey: true,
      });
      ctx.path.pop();
    }
  }
};

class CamelCaseNames {
  constructor(config) {
    this.config = config;
    this.pattern = new RegExp('^_?[a-zA-Z](([^_]*[a-zA-Z]*)*)');
  }

  static get rule() {
    return 'camel-case-names';
  }

  OpenAPISchemaMap(node, _, ctx) {
    return validateNode(node, ctx, 'Schema');
  }

  OpenAPIParameterMap(node, _, ctx) {
    return validateNode(node, ctx, 'Parameter');
  }
}

module.exports = CamelCaseNames;
