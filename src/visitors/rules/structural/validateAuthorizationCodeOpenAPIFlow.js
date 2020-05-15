class ValidateAuthorizationCodeOpenAPIFlow {
  static get rule() {
    return 'oas3-schema/auth-code-flow';
  }

  get validators() {
    return {
      authorizationUrl(node, ctx) {
        if (!node.authorizationUrl) {
          ctx.report({
            message: ctx.messageHelpers.missingRequiredField('authorizationUrl'),
            reportOnKey: true,
          });
          return null;
        }
        if (typeof node.authorizationUrl !== 'string') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
      tokenUrl(node, ctx) {
        if (!node.tokenUrl) {
          ctx.report({
            message: ctx.messageHelpers.missingRequiredField('tokenUrl'),
            reportOnKey: true,
          });
          return null;
        }
        if (typeof node.tokenUrl !== 'string') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
      refreshUrl(node, ctx) {
        if (node.refreshUrl && typeof node.refreshUrl !== 'string') {
          ctx.report({
            message: 'The refreshUrl must be a string in the OpenAPI Flow Object',
          });
        }
        return null;
      },
      scopes(node, ctx) {
        const wrongFormatMap = Object.keys(node.scopes)
          .filter((scope) => typeof scope !== 'string' || typeof node.scopes[scope] !== 'string')
          .length > 0;
        if (wrongFormatMap) {
          ctx.report({
            message: 'The scopes field must be a Map[string, string] in the OpenAPI Flow Object',
          });
        }
        return null;
      },
    };
  }

  AuthorizationCodeOpenAPIFlow(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateAuthorizationCodeOpenAPIFlow;
