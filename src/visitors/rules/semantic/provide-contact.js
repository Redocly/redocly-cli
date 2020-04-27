class ProvideContact {
  static get rule() {
    return 'provide-contact';
  }

  constructor(config) {
    this.config = config;
    this.requiredFields = ['name', 'email'];
    this.contactFields = [];
  }

  OpenAPIInfo() {
    return {
      onExit: (node, _, ctx) => {
        const errors = [];
        if (!node.contact) {
          return [ctx.createError(ctx.messageHelpers.missingRequiredField('contact'), 'key')];
        }
        return errors;
      },
    };
  }

  OAS2Info() {
    return {
      onExit: (node, _, ctx) => {
        const errors = [];
        if (!node.contact) {
          return [ctx.createError(ctx.messageHelpers.missingRequiredField('contact'), 'key')];
        }
        return errors;
      },
    };
  }

  OpenAPIContact() {
    return {
      onEnter: (node, _, ctx) => {
        const errors = [];
        this.requiredFields.forEach((fName) => {
          if (Object.keys(node).indexOf(fName) === -1) {
            errors.push(
              ctx.createError(ctx.messageHelpers.missingRequiredField(fName), 'key'),
            );
          }
        });
        return errors;
      },
    };
  }
}

module.exports = ProvideContact;
