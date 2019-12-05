class OperationDescription {
  static get rule() {
    return 'operation-description';
  }

  OpenAPIOperation() {
    return {
      onEnter: (node, _, ctx) => {
        if (!node.description) {
          return [ctx.createError(ctx.messageHelpers.missingRequiredField('description'), 'key')];
        }
        return null;
      },
    };
  }
}

module.exports = OperationDescription;
