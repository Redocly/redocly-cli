class ValidateOpenAPIExample {
  static get rule() {
    return 'oas3-schema/example';
  }

  get validators() {
    return {
      value(node, ctx) {
        if (node.value && node.externalValue) {
          return ctx.report({
            message: ctx.messageHelpers.mutuallyExclusiveFieldsMessageHelper(['value', 'externalValue']),
            reportOnKey: true,
          });
        }
        return null;
      },
      externalValue(node, ctx) {
        if (node.externalValue && typeof node.externalValue !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        if (node.value && node.externalValue) {
          return ctx.report({
            message: ctx.messageHelpers.mutuallyExclusiveFieldsMessageHelper(['value', 'externalValue']),
            reportOnKey: true,
          });
        }
        return null;
      },
      description(node, ctx) {
        if (node.description && typeof node.description !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
      summary(node, ctx) {
        if (node.summary && typeof node.summary !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
    };
  }

  OpenAPIExample(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOpenAPIExample;
