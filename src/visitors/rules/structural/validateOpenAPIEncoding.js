class ValidateOpenAPIEncoding {
  static get rule() {
    return 'oas3-schema/encoding';
  }

  get validators() {
    return {
      contentType(node, ctx) {
        if (node && node.contentType && typeof node.contentType !== 'string') {
          ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        return null;
      },
      style(node, ctx) {
        if (node && node.style && typeof node.style !== 'string') {
          ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        return null;
      },
      explode(node, ctx) {
        if (node && node.explode && typeof node.explode !== 'boolean') {
          ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'), 'value');
        }
        return null;
      },
      allowReserved(node, ctx) {
        if (node && node.allowReserved && typeof node.allowReserved !== 'boolean') {
          ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'), 'value');
        }
        return null;
      },
    };
  }

  OpenAPIEncoding() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.rule, this.validators,
      ),
    };
  }
}

module.exports = ValidateOpenAPIEncoding;
