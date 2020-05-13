class ModelDescription {
  static get rule() {
    return 'model-description';
  }

  OpenAPIModel(node, _, ctx) {
    if (typeof node.description !== 'string') {
      return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
    }
    if (node && !node.description && node.description !== '') {
      return [ctx.createError(ctx.messageHelpers.missingRequiredField('description'), 'key')];
    }
    return [];
  }
}

module.exports = ModelDescription;
