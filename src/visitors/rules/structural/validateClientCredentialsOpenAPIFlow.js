/* eslint-disable class-methods-use-this */
import createError, { createErrorMissingRequiredField, createErrrorFieldTypeMismatch } from '../../../error';

import AbstractVisitor from '../../utils/AbstractVisitor';

class ValidateClientCredentialsOpenAPIFlow extends AbstractVisitor {
  static get ruleName() {
    return 'client-creds-flow';
  }

  get validators() {
    return {
      tokenUrl(node, ctx) {
        if (!node.tokenUrl) return createErrorMissingRequiredField('tokenUrl', node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (typeof node.tokenUrl !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      refreshUrl(node, ctx) {
        if (node.refreshUrl && typeof node.refreshUrl !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      scopes(node, ctx) {
        const wrongFormatMap = Object.keys(node.scopes)
          .filter((scope) => typeof scope !== 'string' || typeof node.scopes[scope] !== 'string')
          .length > 0;
        if (wrongFormatMap) return createError('The scopes field must be a Map[string, string] in the Open API Flow Object', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        return null;
      },
    };
  }

  ClientCredentialsOpenAPIFlow() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.validators, this.rule,
      ),
    };
  }
}

module.exports = ValidateClientCredentialsOpenAPIFlow;
