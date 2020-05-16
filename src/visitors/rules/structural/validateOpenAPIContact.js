class ValidateOpenAPIContact {
  static get rule() {
    return 'oas3-schema/contact';
  }

  get validators() {
    return {
      name(node, ctx) {
        if ((node && node.name) && typeof node.name !== 'string') {
          ctx.report({ message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string') });
        }
      },
      url(node, ctx) {
        if ((node && node.url) && typeof node.url !== 'string') {
          ctx.report({ message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string') });
        }
      },
      email(node, ctx) {
        if ((node && node.email) && typeof node.email !== 'string') {
          ctx.report({ message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string') });
        }
      },

    };
  }

  OpenAPIContact(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOpenAPIContact;
