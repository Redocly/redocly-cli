class ValidateOpenAPIServerVariable {
  static get rule() {
    return 'oas3-schema/server-variable';
  }

  get validators() {
    return {
      default(node, ctx) {
        if (!node || !node.default) return ctx.createError(ctx.messageHelpers.missingRequiredField('default'), 'key');
        if (typeof node.default !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        return null;
      },
      description(node, ctx) {
        return node && node.description && typeof node.description !== 'string'
          ? ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value') : null;
      },
      enum(node, ctx) {
        if (node && node.enum) {
          if (!Array.isArray(node.enum)) {
            return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('array'), 'value');
          }
          if (node.type && node.enum.filter((item) => typeof item !== 'string').length !== 0) {
            return ctx.createError('All values of "enum" field must be strings', 'value');
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
