class ValidateOpenAPIPath {
  static get rule() {
    return 'oas3-schema/path';
  }

  get validators() {
    return {
      summary(node, ctx) {
        return node && node.summary && typeof node.summary !== 'string'
          ? ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value') : null;
      },
      description(node, ctx) {
        return node && node.description && typeof node.description !== 'string'
          ? ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value') : null;
      },
      servers(node, ctx) {
        return node && node.servers && !Array.isArray(node.servers)
          ? ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('array'), 'value') : null;
      },
      parameters(node, ctx) {
        if (!node || !node.parameters) return null;
        if (!Array.isArray(node.parameters)) {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('array'), 'value');
        }
        if ((new Set(node.parameters)).size !== node.parameters.length) {
          return ctx.createError('parameters must be unique in the Path Item object', 'value');
        }
        return null;
      },
    };
  }

  OpenAPIPath() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.rule, this.validators,
      ),
    };
  }
}

module.exports = ValidateOpenAPIPath;
