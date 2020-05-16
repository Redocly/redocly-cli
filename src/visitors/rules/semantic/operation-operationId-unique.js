class OperationIdUnique {
  static get rule() {
    return 'operation-operationId-unique';
  }

  constructor(config) {
    this.config = config;
    this.operationIds = {};
  }

  OpenAPIOperation(node, _, ctx) {
    if (node.operationId) {
      if (this.operationIds[node.operationId]) {
        this.operationIds[node.operationId] += 1;
        return ctx.report({
          message: 'The "operationId" fields must be unique.',
        });
      }
      this.operationIds[node.operationId] = 1;
    }
    return null;
  }
}

module.exports = OperationIdUnique;
