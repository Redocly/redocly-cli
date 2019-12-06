class OperationsTagsAlpabetical {
  static get rule() {
    return 'operations-tags-alpabetical';
  }

  OpenAPIOperation() {
    return {
      onEnter: (node, _, ctx) => {
        if (!node.tags) return [];
        if (!Array.isArray(node.tags)) return [];

        const errors = [];
        ctx.path.push('tags');
        for (let i = 0; i < node.tags.length - 1; i++) {
          if (node.tags[i] > node.tags[i + 1]) {
            errors.push(ctx.createError('The operations\' tags array should be in alphabetical order', 'key'));
          }
        }
        ctx.path.pop();
        return errors;
      },
    };
  }
}

module.exports = OperationsTagsAlpabetical;
