class OperationTags {
  static get rule() {
    return 'operation-tags';
  }


  OpenAPIOperation() {
    return {
      onEnter: (node, _, ctx) => (node.tags ? null : [ctx.createError('Missing required field "tags".', 'key')]),
    };
  }
}

module.exports = OperationTags;
