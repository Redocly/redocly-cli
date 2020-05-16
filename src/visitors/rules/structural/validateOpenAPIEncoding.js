class ValidateOpenAPIEncoding {
  static get rule() {
    return 'oas3-schema/encoding';
  }

  get validators() {
    return {
      contentType(node, ctx) {
        if (node && node.contentType && typeof node.contentType !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
      style(node, ctx) {
        if (node && node.style && typeof node.style !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
      explode(node, ctx) {
        if (node && node.explode && typeof node.explode !== 'boolean') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'),
          });
        }
        return null;
      },
      allowReserved(node, ctx) {
        if (node && node.allowReserved && typeof node.allowReserved !== 'boolean') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'),
          });
        }
        return null;
      },
    };
  }

  OpenAPIEncoding(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOpenAPIEncoding;
