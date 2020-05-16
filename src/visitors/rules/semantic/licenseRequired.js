class LicenseRequired {
  static get rule() {
    return 'license-required';
  }

  OpenAPIInfo(node, definition, ctx) {
    if (!node.license) {
      ctx.report({ message: ctx.messageHelpers.missingRequiredField('license'), reportOnKey: true });
    }
    return null;
  }
}

module.exports = LicenseRequired;
