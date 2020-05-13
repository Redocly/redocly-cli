class ValidateOpenAPIResponse {
  static get rule() {
    return 'oas3-schema/response';
  }

  get validators() {
    return {
      description(node, ctx) {
        if (node && !node.description && node.description !== '') {
          return ctx.createError(ctx.messageHelpers.missingRequiredField('description'), 'key');
        }
        if (typeof node.description !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        return [];
      },
    };
  }

  OpenAPIResponse(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOpenAPIResponse;
