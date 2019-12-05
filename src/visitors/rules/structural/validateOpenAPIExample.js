class ValidateOpenAPIExample {
  static get rule() {
    return 'oas3-schema/example';
  }

  get validators() {
    return {
      value(node, ctx) {
        if (node.value && node.externalValue) {
          return ctx.createError(ctx.messageHelpers.mutuallyExclusiveFieldsMessageHelper(['value', 'externalValue']), 'key');
        }
        return null;
      },
      externalValue(node, ctx) {
        if (node.externalValue && typeof node.externalValue !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        if (node.value && node.externalValue) {
          return ctx.createError(ctx.messageHelpers.mutuallyExclusiveFieldsMessageHelper(['value', 'externalValue']), 'key');
        }
        return null;
      },
      description(node, ctx) {
        if (node.description && typeof node.description !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        return null;
      },
      summary(node, ctx) {
        if (node.summary && typeof node.summary !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        return null;
      },
    };
  }

  OpenAPIExample() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.rule, this.validators,
      ),
    };
  }
}

module.exports = ValidateOpenAPIExample;
