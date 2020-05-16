class ValidateOAS2Tag {
  static get rule() {
    return 'oas2-tag';
  }

  get validators() {
    return {
      name(node, ctx) {
        if (node && !node.name) {
          ctx.report({
            message: ctx.messageHelpers.missingRequiredField('name'),
            reportOnKey: true,
          });
        }
        if (node && node.name && typeof node.name !== 'string') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
      },
      description(node, ctx) {
        if (node && node.description && typeof node.description !== 'string') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
      },
    };
  }

  OAS2Tag(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOAS2Tag;
