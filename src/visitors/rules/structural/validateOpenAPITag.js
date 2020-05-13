class ValidateOpenAPITag {
  static get rule() {
    return 'oas3-schema/tag';
  }

  get validators() {
    return {
      name(node, ctx) {
        if (!node.name) return ctx.createError(ctx.messageHelpers.missingRequiredField('name'), 'key');
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

  OpenAPITag(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOpenAPITag;
