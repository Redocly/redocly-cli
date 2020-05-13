class OperationTags {
  static get rule() {
    return 'operation-tags';
  }


  OpenAPIOperation(node, _, ctx) {
    return node.tags ? null : [ctx.createError('Missing required field "tags".', 'key')];
  }
}

module.exports = OperationTags;
