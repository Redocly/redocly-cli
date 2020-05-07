class ValidateAuthorizationCodeOpenAPIFlow {
  static get rule() {
    return 'oas3-schema/auth-code-flow';
  }

  get validators() {
    return {
      authorizationUrl(node, ctx) {
        if (!node.authorizationUrl) return ctx.createError(ctx.messageHelpers.missingRequiredField('authorizationUrl'), 'key');
        if (typeof node.authorizationUrl !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        return null;
      },
      tokenUrl(node, ctx) {
        if (!node.tokenUrl) return ctx.createError(ctx.messageHelpers.missingRequiredField('tokenUrl'), 'key');
        if (typeof node.tokenUrl !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        return null;
      },
      refreshUrl(node, ctx) {
        if (node.refreshUrl && typeof node.refreshUrl !== 'string') return ctx.createError('The refreshUrl must be a string in the OpenAPI Flow Object', 'value');
        return null;
      },
      scopes(node, ctx) {
        if (node.scopes) {
          return null;
        }
        const wrongFormatMap = Object.keys(node.scopes)
          .filter((scope) => typeof scope !== 'string' || typeof node.scopes[scope] !== 'string')
          .length > 0;
        if (wrongFormatMap) return ctx.createError('The scopes field must be a Map[string, string] in the OpenAPI Flow Object', 'value');
        return null;
      },
    };
  }

  AuthorizationCodeOpenAPIFlow() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.rule, this.validators,
      ),
    };
  }
}

module.exports = ValidateAuthorizationCodeOpenAPIFlow;
