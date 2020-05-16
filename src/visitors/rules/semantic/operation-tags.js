class OperationTags {
  static get rule() {
    return 'operation-tags';
  }


  OpenAPIOperation(node, _, ctx) {
    if (!node.tags) {
      ctx.report({
        message: 'Missing required field "tags".',
        reportOnKey: true,
      });
    }
  }
}

module.exports = OperationTags;
