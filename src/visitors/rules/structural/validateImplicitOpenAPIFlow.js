/* eslint-disable class-methods-use-this */
import createError, { createErrorMissingRequiredField, createErrrorFieldTypeMismatch } from '../../../error';

import AbstractVisitor from '../../utils/AbstractVisitor';

class ValidateImplicitOpenAPIFlow extends AbstractVisitor {
  static get ruleName() {
    return 'implicit-flow';
  }

  get validators() {
    return {
      authorizationUrl(node, ctx) {
        if (!node.authorizationUrl) return createErrorMissingRequiredField('authorizationUrl', node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (typeof node.authorizationUrl !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      refreshUrl(node, ctx) {
        if (node.refreshUrl && typeof node.refreshUrl !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx);
        return null;
      },
      scopes(node, ctx) {
        if (!node.scopes) return createErrorMissingRequiredField('scopes', node, ctx, { fromRule: this.rule, severity: this.config.level });
        const wrongFormatMap = Object.keys(node.scopes)
          .filter((scope) => typeof scope !== 'string' || typeof node.scopes[scope] !== 'string')
          .length > 0;
        if (wrongFormatMap) return createError('The scopes field must be a Map[string, string] in the Open API Flow Object', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        return null;
      },
    };
  }

  ImplicitOpenAPIFlow() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.rule, this.validators,
      ),
    };
  }
}

module.exports = ValidateImplicitOpenAPIFlow;
