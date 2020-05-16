class ValidateOpenAPIRoot {
  static get rule() {
    return 'oas3-schema/root';
  }

  get validators() {
    return {
      openapi(node, ctx) {
        if (node && !node.openapi) {
          return ctx.report({
            message: ctx.messageHelpers.missingRequiredField('openapi'),
            reportOnKey: true,
          });
        }
        return null;
      },
      info(node, ctx) {
        if (node && !node.info) {
          return ctx.report({
            message: ctx.messageHelpers.missingRequiredField('info'),
            reportOnKey: true,
          });
        }
        return null;
      },
      paths(node, ctx) {
        if (node && !node.paths) {
          return ctx.report({
            message: ctx.messageHelpers.missingRequiredField('paths'),
            reportOnKey: true,
          });
        }
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
