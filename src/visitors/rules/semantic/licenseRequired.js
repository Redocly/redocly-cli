class LicenseRequired {
  static get rule() {
    return 'license-required';
  }

  OpenAPIInfo() {
    return {
      onEnter: (node, definition, ctx) => {
        if (!node.license) {
          return [ctx.createError(ctx.messageHelpers.missingRequiredField('license'), 'value')];
        }
        return null;
      },
    };
  }
}

module.exports = LicenseRequired;
