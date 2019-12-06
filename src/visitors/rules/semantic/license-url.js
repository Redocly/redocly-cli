class LicenseURL {
  static get rule() {
    return 'license-url';
  }

  OpenAPILicense() {
    return {
      onEnter: (node, _, ctx) => {
        if (!node.url) {
          return [ctx.createError(ctx.messageHelpers.missingRequiredField('url'))];
        }
        return null;
      },
    };
  }
}

module.exports = LicenseURL;
