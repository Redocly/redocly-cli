class ValidatePasswordOpenAPIFlow {
  static get rule() {
    return 'oas3-schema/password-flow';
  }

  get validators() {
    return {
      tokenUrl(node, ctx) {
        if (!node.tokenUrl) return ctx.createError(ctx.messageHelpers.missingRequiredField('tokenUrl'), 'key');
        if (typeof node.tokenUrl !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        return null;
      },
      refreshUrl(node, ctx) {
        if (node.refreshUrl && typeof node.refreshUrl !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        return null;
      },
      scopes(node, ctx) {
        const wrongFormatMap = Object.keys(node.scopes)
          .filter((scope) => typeof scope !== 'string' || typeof node.scopes[scope] !== 'string')
          .length > 0;
        if (wrongFormatMap) {
          return ctx.createError('The scopes field must be a Map[string, string] in the OpenAPI Flow Object', 'value');
        }
        return null;
      },
    };
  }

  PasswordOpenAPIFlow(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidatePasswordOpenAPIFlow;
