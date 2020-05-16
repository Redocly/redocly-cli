class ParameterDescription {
  static get rule() {
    return 'parameter-description';
  }

  OpenAPIParameter(node, _, ctx) {
    if (typeof node.description !== 'string') {
      return ctx.report({
        message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
      });
    }
    if (node && !node.description && node.description !== '') {
      return ctx.report({
        message: 'The "Parameter" object should contain "description" field.',
        reportOnKey: true,
      });
    }
    return null;
  }
}

module.exports = ParameterDescription;
