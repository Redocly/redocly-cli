class ValidateOAS2SecurityScheme {
  static get rule() {
    return 'oas2-schema/security-scheme';
  }

  get validators() {
    return {
      type(node, ctx) {
        if (!node.type) {
          return ctx.report({
            message: ctx.messageHelpers.missingRequiredField('type'),
            reportOnKey: true,
          });
        }
        if (typeof node.type !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
      description(node, ctx) {
        if (node && node.description && typeof node.description !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
      name(node, ctx) {
        if (!node.type || node.type !== 'apiKey') return null;
        if (!node.name) {
          return ctx.report({
            message: ctx.messageHelpers.missingRequiredField('name'),
            reportOnKey: true,
          });
        }
        if (typeof node.name !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
      in(node, ctx) {
        if (!node.type || node.type !== 'apiKey') return null;
        if (!node.in) {
          return ctx.report({
            message: ctx.messageHelpers.missingRequiredField('in'),
            reportOnKey: true,
          });
        }
        if (typeof node.in !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        if (['query', 'header'].indexOf(node.in) === -1) {
          return ctx.report({
            message: 'Value of the "in" field can be only "query" or "header".',
          });
        }
        return null;
      },
      flow(node, ctx) {
        if (!node.type || node.type !== 'oauth2') return null;
        if (!node.flow) {
          return ctx.report({
            message: ctx.messageHelpers.missingRequiredField('flow'),
            reportOnKey: true,
          });
        }
        if (typeof node.flow !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        if (['implicit', 'password', 'application', 'accessCode'].indexOf(node.flow) === -1) {
          return ctx.report({
            message: 'Value of the "flow" field can be only "implicit", "password", "application", "accessCode".',
          });
        }
        return null;
      },
      authorizationUrl(node, ctx) {
        if (!node.type || node.type !== 'oauth2') return null;
        if (!node.flow || ['implicit', 'accessCode'].indexOf(node.flow) === -1) return null;
        if (!node.authorizationUrl) {
          return ctx.report({
            message: ctx.messageHelpers.missingRequiredField('authorizationUrl'),
            reportOnKey: true,
          });
        }
        if (typeof node.authorizationUrl !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
      tokenUrl(node, ctx) {
        if (!node.type || node.type !== 'oauth2') return null;
        if (!node.flow || ['password', 'application', 'accessCode'].indexOf(node.flow) === -1) return null;
        if (!node.tokenUrl) {
          return ctx.report({
            message: ctx.messageHelpers.missingRequiredField('tokenUrl'),
            reportOnKey: true,
          });
        }
        if (typeof node.tokenUrl !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
      scopes(node, ctx) {
        if (!node.type || node.type !== 'oauth2') return null;
        if (!node.scopes) {
          return ctx.report({
            message: ctx.messageHelpers.missingRequiredField('scopes'),
          });
        }
        return null;
      },
    };
  }

  OAS2SecurityScheme(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOAS2SecurityScheme;
