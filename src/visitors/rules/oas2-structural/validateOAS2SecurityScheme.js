class ValidateOAS2SecurityScheme {
  static get rule() {
    return 'oas2-schema/security-scheme';
  }

  get validators() {
    return {
      type(node, ctx) {
        if (!node.type) return ctx.createError(ctx.messageHelpers.missingRequiredField('type'), 'key');
        if (typeof node.type !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        return null;
      },
      description(node, ctx) {
        if (node && node.description && typeof node.description !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        return null;
      },
      name(node, ctx) {
        if (!node.type || node.type !== 'apiKey') return null;
        if (!node.name) return ctx.createError(ctx.messageHelpers.missingRequiredField('name'), 'key');
        if (typeof node.name !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        return null;
      },
      in(node, ctx) {
        if (!node.type || node.type !== 'apiKey') return null;
        if (!node.in) return ctx.createError(ctx.messageHelpers.missingRequiredField('in'), 'key');
        if (typeof node.in !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        if (['query', 'header'].indexOf(node.in) === -1) return ctx.createError('Value of the "in" field can be only "query" or "header".', 'value');
        return null;
      },
      flow(node, ctx) {
        if (!node.type || node.type !== 'oauth2') return null;
        if (!node.flow) return ctx.createError(ctx.messageHelpers.missingRequiredField('flow'), 'key');
        if (typeof node.flow !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        if (['implicit', 'password', 'application', 'accessCode'].indexOf(node.flow) === -1) {
          return ctx.createError('Value of the "flow" field can be only "implicit", "password", "application", "accessCode".', 'value');
        }
        return null;
      },
      authorizationUrl(node, ctx) {
        if (!node.type || node.type !== 'oauth2') return null;
        if (!node.flow || ['implicit', 'accessCode'].indexOf(node.flow) === -1) return null;
        if (!node.authorizationUrl) return ctx.createError(ctx.messageHelpers.missingRequiredField('authorizationUrl'), 'key');
        if (typeof node.authorizationUrl !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        return null;
      },
      tokenUrl(node, ctx) {
        if (!node.type || node.type !== 'oauth2') return null;
        if (!node.flow || ['password', 'application', 'accessCode'].indexOf(node.flow) === -1) return null;
        if (!node.tokenUrl) return ctx.createError(ctx.messageHelpers.missingRequiredField('tokenUrl'), 'key');
        if (typeof node.tokenUrl !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        return null;
      },
      scopes(node, ctx) {
        if (!node.type || node.type !== 'oauth2') return null;
        if (!node.scopes) return ctx.createError(ctx.messageHelpers.missingRequiredField('scopes'), 'key');
        return null;
      },
    };
  }

  OAS2SecurityScheme() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.rule, this.validators,
      ),
    };
  }
}

module.exports = ValidateOAS2SecurityScheme;
