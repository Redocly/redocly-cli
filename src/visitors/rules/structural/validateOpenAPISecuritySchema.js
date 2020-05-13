class ValidateOpenAPISecuritySchema {
  static get rule() {
    return 'oas3-schema/secuirty-schema';
  }

  get validators() {
    return {
      type(node, ctx) {
        if (!node.type) return ctx.createError(ctx.messageHelpers.missingRequiredField('type'), 'key');
        if (typeof node.type !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        if (!['apiKey', 'http', 'oauth2', 'openIdConnect'].includes(node.type)) {
          return ctx.createError(
            'The type value can only be one of the following "apiKey", "http", "oauth2", "openIdConnect" is required for the OpenAPI Security Scheme object.',
            'value',
          );
        }
        return null;
      },
      description(node, ctx) {
        if (node.description && typeof node.description !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        return null;
      },
      name(node, ctx) {
        if (node.type !== 'apiKey') return null;
        if (typeof node.name !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        return null;
      },
      in(node, ctx) {
        if (node.type !== 'apiKey') return null;
        if (!node.in) return ctx.createError(ctx.messageHelpers.missingRequiredField('in'), 'key');
        if (typeof node.in !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        if (!['query', 'header', 'cookie'].includes(node.in)) {
          return ctx.createError('The in value can only be one of the following "query", "header" or "cookie" for the OpenAPI Security Scheme object', 'value');
        }
        return null;
      },
      scheme(node, ctx) {
        if (node.type !== 'http') return null;
        if (!node.scheme) return ctx.createError(ctx.messageHelpers.missingRequiredField('scheme'), 'key');
        if (typeof node.scheme !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        return null;
      },
      bearerFormat(node, ctx) {
        if (node.bearerFormat && node.type !== 'http') {
          return ctx.createError('The bearerFormat field is applicable only for http', 'key');
        }
        if (node.bearerFormat && typeof node.bearerFormat !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        return null;
      },
      flows(node, ctx) {
        if (node.type !== 'oauth2') return null;
        if (!node.flows) return ctx.createError(ctx.messageHelpers.missingRequiredField('flows'), 'key');
        return null;
      },
      openIdConnectUrl(node, ctx) {
        if (node.type !== 'openIdConnect') return null;
        if (!node.openIdConnectUrl) {
          return ctx.createError(ctx.messageHelpers.missingRequiredField('openIdConnectUrl'), 'key');
        }
        if (typeof node.openIdConnectUrl !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        return null;
      },
    };
  }

  OpenAPISecuritySchema(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOpenAPISecuritySchema;
