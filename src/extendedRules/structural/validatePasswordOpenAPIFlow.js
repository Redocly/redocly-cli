/* eslint-disable class-methods-use-this */
import createError, { createErrorMissingRequiredField, createErrrorFieldTypeMismatch } from '../../error';

import { isRuleEnabled } from '../utils';
import AbstractRule from '../utils/AbstractRule';

class ValidatePasswordOpenAPIFlow extends AbstractRule {
  static get ruleName() {
    return 'validatePasswordOpenAPIFlow';
  }

  validators() {
    return {
      tokenUrl: (node, ctx) => {
        if (!node.tokenUrl) return createErrorMissingRequiredField('tokenUrl', node, ctx, { severity: this.config.level });
        if (typeof node.tokenUrl !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { severity: this.config.level });
        return null;
      },
      refreshUrl: (node, ctx) => {
        if (node.refreshUrl && typeof node.refreshUrl !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { severity: this.config.level });
        return null;
      },
      scopes: (node, ctx) => {
        const wrongFormatMap = Object.keys(node.scopes)
          .filter((scope) => typeof scope !== 'string' || typeof node.scopes[scope] !== 'string')
          .length > 0;
        if (wrongFormatMap) return createError('The scopes field must be a Map[string, string] in the Open API Flow Object', node, ctx, { target: 'value', severity: this.config.level });
        return null;
      },
    };
  }

  PasswordOpenAPIFlow() {
    return {
      onEnter: (node, definition, ctx) => {
        const result = [];
        const validators = this.validators();
        const vals = Object.keys(validators);
        for (let i = 0; i < vals.length; i += 1) {
          if (isRuleEnabled(this, vals[i])) {
            const res = validators[vals[i]](node, ctx, this.config);
            if (res) {
              if (Array.isArray(res)) result.push(...res);
              else result.push(res);
            }
          }
        }
        return result;
      },
    };
  }
}

module.exports = ValidatePasswordOpenAPIFlow;
