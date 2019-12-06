class ParameterDescription {
  static get rule() {
    return 'parameter-description';
  }

  OpenAPIParameter() {
    return {
      onEnter: (node, _, ctx) => {
        if (!node.description) {
          return [ctx.createError('The "Parameter" object should contain "description" field.', 'key')];
        }
        return [];
      },
    };
  }
}

module.exports = ParameterDescription;
