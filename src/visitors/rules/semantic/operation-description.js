class OperationDescription {
  static get rule() {
    return 'operation-description';
  }

  OpenAPIOperation() {
    return {
      onEnter: (node, _, ctx) => {
        if (typeof node.description !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        if (node && !node.description && node.description !== '') {
          return [ctx.createError(ctx.messageHelpers.missingRequiredField('description'), 'key')];
        }
        return null;
      },
    };
  }
}

module.exports = OperationDescription;
