class ValidateOpenAPIServer {
  static get rule() {
    return 'oas3-schema/server';
  }

  get validators() {
    return {
      url(node, ctx) {
        if (!node || !node.url || typeof node.url !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.missingRequiredField('url'),
            reportOnKey: true,
          });
        }
        if (typeof node.url !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
      description(node, ctx) {
        if (node && node.description && typeof node.description !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
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
