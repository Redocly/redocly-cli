class ValidateOAS2InfoContact {
  static get rule() {
    return 'oas2-schema/contact';
  }

  get validators() {
    return {
      name(node, ctx) {
        return (node && node.name) && typeof node.name !== 'string'
          ? ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value') : null;
      },
      url(node, ctx) {
        return (node && node.url) && typeof node.url !== 'string'
          ? ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value') : null;
      },
      email(node, ctx) {
        return (node && node.email) && typeof node.email !== 'string'
          ? ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value') : null;
      },

    };
  }

  OAS2Contact(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOAS2InfoContact;
