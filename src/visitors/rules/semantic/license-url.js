class LicenseURL {
  static get rule() {
    return 'license-url';
  }

  OpenAPILicense(node, _, ctx) {
    if (!node.url) {
      ctx.report({ message: ctx.messageHelpers.missingRequiredField('url'), reportOnKey: true });
    }
    return null;
  }
}

module.exports = LicenseURL;
