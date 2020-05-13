class ValidateOpenAPIServer {
  static get rule() {
    return 'oas3-schema/server';
  }

  get validators() {
    return {
      url(node, ctx) {
        if (!node || !node.url || typeof node.url !== 'string') {
          return ctx.createError(ctx.messageHelpers.missingRequiredField('url'), 'key');
        }
        if (typeof node.url !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        return null;
      },
      description(node, ctx) {
        return node && node.description && typeof node.description !== 'string'
          ? ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value') : null;
      },
    };
  }

  OpenAPIServer(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOpenAPIServer;
