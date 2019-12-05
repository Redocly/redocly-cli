class ValidateOpenAPIContact {
  static get rule() {
    return 'oas3-schema/contact';
  }

  get validators() {
    return {
      name(node, ctx) {
        return (node && node.name) && typeof node.name !== 'string' ? ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value') : null;
      },
      url(node, ctx) {
        return (node && node.url) && typeof node.url !== 'string' ? ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value') : null;
      },
      email(node, ctx) {
        return (node && node.url) && typeof node.url !== 'string' ? ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value') : null;
      },

    };
  }

  OpenAPIContact() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.rule, this.validators,
      ),
    };
  }
}

module.exports = ValidateOpenAPIContact;
