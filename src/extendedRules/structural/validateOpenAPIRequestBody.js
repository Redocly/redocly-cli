/* eslint-disable class-methods-use-this */
import { createErrrorFieldTypeMismatch, createErrorMissingRequiredField } from '../../error';

import isRuleEnabled from '../utils';
import AbstractRule from '../utils/AbstractRule';

class ValidateOpenAPIRequestBody extends AbstractRule {
  static get ruleName() {
    return 'request-body';
  }

  validators() {
    return {
      description: (node, ctx) => {
        if (node && node.description && typeof node.description !== 'string') {
          return createErrrorFieldTypeMismatch('string.', node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
        return null;
      },
      content: (node, ctx) => {
        if (node && !node.content) {
          return createErrorMissingRequiredField('content', node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
        return null;
      },
      required: (node, ctx) => {
        if (node && node.required && typeof node.required !== 'boolean') {
          return createErrrorFieldTypeMismatch('boolean.', node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
        return null;
      },
    };
  }

  OpenAPIRequestBody() {
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

module.exports = ValidateOpenAPIRequestBody;
