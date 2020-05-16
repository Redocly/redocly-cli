class ValidateOAS2Info {
  static get rule() {
    return 'oas2-schema/info';
  }

  get validators() {
    return {
      title(node, ctx) {
        if (!node || !node.title) {
          ctx.report({
            message: ctx.messageHelpers.missingRequiredField('title'),
            reportOnKey: true,
          });
        }
      },
      version(node, ctx) {
        if (!node || (!node.version && node.version !== '')) {
          ctx.report({
            message: ctx.messageHelpers.missingRequiredField('version'),
            reportOnKey: true,
          });
        }
      },
      description() {
        return null;
      },
      termsOfService() {
        return null;
      },
    };
  }

  OAS2Info(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOAS2Info;
