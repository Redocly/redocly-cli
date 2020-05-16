class OperationOperationId {
  static get rule() {
    return 'operation-operationId';
  }

  OpenAPIOperation(node, _, ctx) {
    if (!node.operationId) {
      ctx.report({
        message: ctx.messageHelpers.missingRequiredField('operationId'),
        reportOnKey: true,
      });
    }
  }
}

module.exports = OperationOperationId;
