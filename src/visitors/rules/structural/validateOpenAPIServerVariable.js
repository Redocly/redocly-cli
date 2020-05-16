class ValidateOpenAPIServerVariable {
  static get rule() {
    return 'oas3-schema/server-variable';
  }

  get validators() {
    return {
      default(node, ctx) {
        if (!node || !node.default) {
          return ctx.report({
            message: ctx.messageHelpers.missingRequiredField('default'),
            reportOnKey: true,
          });
        }
        if (typeof node.default !== 'string') {
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
      enum(node, ctx) {
        if (node && node.enum) {
          if (!Array.isArray(node.enum)) {
            return ctx.report({
              message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('array'),
            });
          }
          if (node.type && node.enum.filter((item) => typeof item !== 'string').length !== 0) {
            return ctx.report({
              message: 'All values of "enum" field must be strings',
            });
          }
        }
        return null;
      },
    };
  }

  OpenAPIServerVariable(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOpenAPIServerVariable;
