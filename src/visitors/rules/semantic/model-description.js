class ModelDescription {
  static get rule() {
    return 'model-description';
  }

  OpenAPIModel(node, _, ctx) {
    if (typeof node.description !== 'string') {
      ctx.report({ message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string') });
    }
    if (node && !node.description && node.description !== '') {
      ctx.report({ message: ctx.messageHelpers.missingRequiredField('description'), reportOnKey: true });
    }
    return [];
  }
}

module.exports = ModelDescription;
