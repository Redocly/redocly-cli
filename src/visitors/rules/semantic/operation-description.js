class OperationDescription {
  static get rule() {
    return 'operation-description';
  }

  OpenAPIOperation(node, _, ctx) {
    if (typeof node.description !== 'string') {
      return ctx.report({
        message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
      });
    }
    if (node && !node.description && node.description !== '') {
      return ctx.report({
        message: ctx.messageHelpers.missingRequiredField('description'),
        reportOnKey: true,
      });
    }
    return null;
  }
}

module.exports = OperationDescription;
