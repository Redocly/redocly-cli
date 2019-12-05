class ModelDescription {
  static get rule() {
    return 'model-description';
  }

  OpenAPIModel() {
    return {
      onEnter: (node, _, ctx) => {
        if (!node.description) {
          return [ctx.createError(ctx.messageHelpers.missingRequiredField('description'), 'key')];
        }
        return [];
      },
    };
  }
}

module.exports = ModelDescription;
