class ValidateOpenAPIInfo {
  static get rule() {
    return 'oas3-schema/info';
  }

  get validators() {
    return {
      title(node, ctx) {
        if (!node || !node.title) {
          return ctx.report({
            message: ctx.messageHelpers.missingRequiredField('title'),
            reportOnKey: true,
          });
        }
        return null;
      },
      version(node, ctx) {
        if (!node || (!node.version && node.version !== '')) {
          return ctx.report({
            message: ctx.messageHelpers.missingRequiredField('version'),
            reportOnKey: true,
          });
        }
        return null;
      },
      description() {
        return null;
      },
      termsOfService() {
        return null;
      },
    };
  }

  OpenAPIInfo(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOpenAPIInfo;
