class NoScalarRef {
  static get rule() {
    return 'no-scalar-ref';
  }

  any() {
    return {
      onExit: (node, definition, ctx) => {
        const errors = [];
        for (const property of Object.keys(definition.properties)) {
          if (definition.properties[property] === null && Object.keys(node[property] || {}).includes('$ref')) {
            ctx.path.push(property);
            ctx.path.push('$ref');
            errors.push(ctx.createError(
              '$ref reference is used for a scalar value.', 'key',
            ));
            ctx.path.pop();
            ctx.path.pop();
          }
        }
        return errors;
      },
    };
  }
}

module.exports = NoScalarRef;
