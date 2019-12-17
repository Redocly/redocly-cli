class OperationOperationId {
  static get rule() {
    return 'operation-operationId';
  }

  OpenAPIOperation() {
    return {
      onEnter: (node, _, ctx) => {
        if (!node.operationId) {
          return [ctx.createError(ctx.messageHelpers.missingRequiredField('operationId'), 'key')];
        }
        return [];
      },
    };
  }
}

module.exports = OperationOperationId;
