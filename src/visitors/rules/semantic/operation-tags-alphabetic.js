class OperationsTagsAlpabetical {
  static get rule() {
    return 'operations-tags-alpabetical';
  }

  OpenAPIOperation(node, _, ctx) {
    if (!node.tags) return;
    if (!Array.isArray(node.tags)) return;

    ctx.path.push('tags');
    for (let i = 0; i < node.tags.length - 1; i++) {
      if (node.tags[i] > node.tags[i + 1]) {
        ctx.report({
          message: 'The operations\' tags array should be in alphabetical order',
          reportOnKey: true,
        });
      }
    }
    ctx.path.pop();
  }
}

module.exports = OperationsTagsAlpabetical;
