class ValidateOAS2Tag {
  static get rule() {
    return 'oas2-tag';
  }

  get validators() {
    return {
      name(node, ctx) {
        if (node && !node.name) {
          return ctx.createError(ctx.messageHelpers.missingRequiredField('name'), 'key');
        }
        if (node && node.name && typeof node.name !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        return null;
      },
      description(node, ctx) {
        if (node && node.description && typeof node.description !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        return null;
      },
    };
  }

  OAS2Tag(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOAS2Tag;
