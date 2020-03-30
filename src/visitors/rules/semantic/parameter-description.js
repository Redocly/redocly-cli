class ParameterDescription {
  static get rule() {
    return 'parameter-description';
  }

  OpenAPIParameter() {
    return {
      onEnter: (node, _, ctx) => {
        if (typeof node.description !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        if (node && !node.description && node.description !== '') {
          return [ctx.createError('The "Parameter" object should contain "description" field.', 'key')];
        }
        return [];
      },
    };
  }
}

module.exports = ParameterDescription;
