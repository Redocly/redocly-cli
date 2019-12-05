const validateNode = (node, ctx, name) => {
  const errors = [];
  const names = Object.keys(node);
  for (let i = 0; i < names.length; i++) {
    if (names[i].indexOf('_') > 0) {
      ctx.path.push(names[i]);
      const error = ctx.createError(`${name}'s names should be in camelCase.`, 'key');
      errors.push(error);
      ctx.path.pop();
    }
  }
  return errors;
};

class CamelCaseNames {
  constructor(config) {
    this.config = config;
    this.pattern = new RegExp('^_?[a-zA-Z](([^_]*[a-zA-Z]*)*)');
  }

  static get rule() {
    return 'camel-case-names';
  }

  OpenAPISchemaMap() {
    return {
      onEnter: (node, _, ctx) => validateNode(node, ctx, 'Schema'),
    };
  }

  OpenAPIParameterMap() {
    return {
      onEnter: (node, _, ctx) => validateNode(node, ctx, 'Parameter'),
    };
  }
}

module.exports = CamelCaseNames;
