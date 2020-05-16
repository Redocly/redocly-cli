class ValidateOpenAPIPath {
  static get rule() {
    return 'oas3-schema/path';
  }

  get validators() {
    return {
      summary(node, ctx) {
        if (node && node.summary && typeof node.summary !== 'string') {
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
      servers(node, ctx) {
        if (node && node.servers && !Array.isArray(node.servers)) {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('array'),
          });
        }
        return null;
      },
      parameters(node, ctx) {
        if (!node || !node.parameters) return null;
        if (!Array.isArray(node.parameters)) {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('array'),
          });
        }
        if ((new Set(node.parameters)).size !== node.parameters.length) {
          return ctx.report({
            message: 'parameters must be unique in the Path Item object',
          });
        }
        return null;
      },
    };
  }

  OpenAPIPath(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOpenAPIPath;
