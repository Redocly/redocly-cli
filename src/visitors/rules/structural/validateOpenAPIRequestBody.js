class ValidateOpenAPIRequestBody {
  static get rule() {
    return 'oas3-schema/request-body';
  }

  get validators() {
    return {
      description(node, ctx) {
        if (node && node.description && typeof node.description !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
      content(node, ctx) {
        if (node && !node.content) {
          return ctx.report({
            message: ctx.messageHelpers.missingRequiredField('content'),
            reportOnKey: true,
          });
        }
        return null;
      },
      required(node, ctx) {
        if (node && node.required && typeof node.required !== 'boolean') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'),
          });
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
