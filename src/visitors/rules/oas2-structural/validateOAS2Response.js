class ValidateOAS2Response {
  static get rule() {
    return 'oas2-schema/response';
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
        return null;
      },
    };
  }

  OAS2Response(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOAS2Response;
