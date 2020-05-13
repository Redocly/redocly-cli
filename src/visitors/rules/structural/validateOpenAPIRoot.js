class ValidateOpenAPIRoot {
  static get rule() {
    return 'oas3-schema/root';
  }

  get validators() {
    return {
      openapi(node, ctx) {
        if (node && !node.openapi) return ctx.createError(ctx.messageHelpers.missingRequiredField('openapi'), 'key');
        return null;
      },
      info(node, ctx) {
        if (node && !node.info) return ctx.createError(ctx.messageHelpers.missingRequiredField('info'), 'key');
        return null;
      },
      paths(node, ctx) {
        if (node && !node.paths) return ctx.createError(ctx.messageHelpers.missingRequiredField('paths'), 'key');
        return null;
      },
      security: () => null,
    };
  }

  OpenAPIRoot(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOpenAPIRoot;
