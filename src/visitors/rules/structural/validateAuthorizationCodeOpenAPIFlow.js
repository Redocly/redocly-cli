/* eslint-disable class-methods-use-this */
import createError, { createErrorMissingRequiredField, createErrrorFieldTypeMismatch } from '../../../error';

import AbstractVisitor from '../../utils/AbstractVisitor';

class ValidateAuthorizationCodeOpenAPIFlow extends AbstractVisitor {
  static get ruleName() {
    return 'auth-code-flow';
  }

  get validators() {
    return {
      authorizationUrl(node, ctx) {
        if (!node.authorizationUrl) return createErrorMissingRequiredField('authorizationUrl', node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (typeof node.authorizationUrl !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      tokenUrl(node, ctx) {
        if (!node.tokenUrl) return createErrorMissingRequiredField('tokenUrl', node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (typeof node.tokenUrl !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      refreshUrl(node, ctx) {
        if (node.refreshUrl && typeof node.refreshUrl !== 'string') return createError('The refreshUrl must be a string in the Open API Flow Object', node, ctx, { fromRule: this.rule, severity: this.config.severity });
        return null;
      },
      scopes(node, ctx) {
        const wrongFormatMap = Object.keys(node.scopes)
          .filter((scope) => typeof scope !== 'string' || typeof node.scopes[scope] !== 'string')
          .length > 0;
        if (wrongFormatMap) return createError('The scopes field must be a Map[string, string] in the Open API Flow Object', node, ctx, { fromRule: this.rule, severity: this.config.severity });
        return null;
      },
    };
  }

  AuthorizationCodeOpenAPIFlow() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.validators, this.rule,
      ),
    };
  }
}

module.exports = ValidateAuthorizationCodeOpenAPIFlow;
