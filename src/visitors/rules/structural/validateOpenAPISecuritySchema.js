class ValidateOpenAPISecuritySchema {
  static get rule() {
    return 'oas3-schema/secuirty-schema';
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
        if (!['apiKey', 'http', 'oauth2', 'openIdConnect'].includes(node.type)) {
          return ctx.report({
            message: 'The type value can only be one of the following "apiKey", "http", "oauth2", "openIdConnect" is required for the OpenAPI Security Scheme object.',
          });
        }
        return null;
      },
      description(node, ctx) {
        if (node.description && typeof node.description !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
      name(node, ctx) {
        if (node.type !== 'apiKey') return null;
        if (typeof node.name !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
      in(node, ctx) {
        if (node.type !== 'apiKey') return null;
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
        if (!['query', 'header', 'cookie'].includes(node.in)) {
          return ctx.report({
            message: 'The in value can only be one of the following "query", "header" or "cookie" for the OpenAPI Security Scheme object',
          });
        }
        return null;
      },
      scheme(node, ctx) {
        if (node.type !== 'http') return null;
        if (!node.scheme) {
          return ctx.report({
            message: ctx.messageHelpers.missingRequiredField('scheme'),
            reportOnKey: true,
          });
        }
        if (typeof node.scheme !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
      bearerFormat(node, ctx) {
        if (node.bearerFormat && node.type !== 'http') {
          return ctx.report({
            message: 'The bearerFormat field is applicable only for http',
            reportOnKey: true,
          });
        }
        if (node.bearerFormat && typeof node.bearerFormat !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
      flows(node, ctx) {
        if (node.type !== 'oauth2') return null;
        if (!node.flows) {
          return ctx.report({
            message: ctx.messageHelpers.missingRequiredField('flows'),
            reportOnKey: true,
          });
        }
        return null;
      },
      openIdConnectUrl(node, ctx) {
        if (node.type !== 'openIdConnect') return null;
        if (!node.openIdConnectUrl) {
          return ctx.report({
            message: ctx.messageHelpers.missingRequiredField('openIdConnectUrl'),
            reportOnKey: true,
          });
        }
        if (typeof node.openIdConnectUrl !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
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
