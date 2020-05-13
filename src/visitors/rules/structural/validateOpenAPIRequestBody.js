class ValidateOpenAPIRequestBody {
  static get rule() {
    return 'oas3-schema/request-body';
  }

  get validators() {
    return {
      description(node, ctx) {
        if (node && node.description && typeof node.description !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        return null;
      },
      content(node, ctx) {
        if (node && !node.content) {
          return ctx.createError(ctx.messageHelpers.missingRequiredField('content'), 'key');
        }
        return null;
      },
      required(node, ctx) {
        if (node && node.required && typeof node.required !== 'boolean') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'), 'value');
        }
        return null;
      },
    };
  }

  OpenAPIRequestBody(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOpenAPIRequestBody;
