/* eslint-disable class-methods-use-this */
import { createErrorMissingRequiredField, createErrrorFieldTypeMismatch } from '../../error';

import { isRuleEnabled } from '../utils';
import AbstractRule from '../utils/AbstractRule';

class ValidateOpenAPIServer extends AbstractRule {
  static get ruleName() {
    return 'validateOpenAPIServer';
  }

  validators() {
    return {
      url: (node, ctx) => {
        if (!node || !node.url || typeof node.url !== 'string') return createErrorMissingRequiredField('url', node, ctx, this.config.level);
        if (typeof node.url !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, this.config.level);
        return null;
      },
      description: (node, ctx) => (node && node.description && typeof node.description !== 'string'
        ? createErrrorFieldTypeMismatch('string', node, ctx, this.config.level) : null),
    };
  }

  OpenAPIServer() {
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

module.exports = ValidateOpenAPIServer;
