class ProvideContact {
  static get rule() {
    return 'provide-contact';
  }

  constructor(config) {
    this.config = config;
    this.requiredFields = ['name', 'email'];
    this.contactFields = [];
  }

  OpenAPIInfo_exit(node, _, ctx) {
    if (!node.contact) {
      ctx.report({
        message: ctx.messageHelpers.missingRequiredField('contact'),
        reportOnKey: true,
      });
    }
  }

  OAS2Info_exit(node, _, ctx) {
    if (!node.contact) {
      ctx.report({
        message: ctx.messageHelpers.missingRequiredField('contact'),
        reportOnKey: true,
      });
    }
  }

  OpenAPIContact(node, _, ctx) {
    this.requiredFields.forEach((fName) => {
      if (Object.keys(node).indexOf(fName) === -1) {
        ctx.report({
          message: ctx.messageHelpers.missingRequiredField(fName),
          reportOnKey: true,
        });
      }
    });
  }
}

module.exports = ProvideContact;
