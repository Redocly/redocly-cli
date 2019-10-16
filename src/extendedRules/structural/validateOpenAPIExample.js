/* eslint-disable class-methods-use-this */
import { createErrrorFieldTypeMismatch, createErrorMutuallyExclusiveFields } from '../../error';

import isRuleEnabled from '../utils';
import AbstractRule from '../utils/AbstractRule';

class ValidateOpenAPIExample extends AbstractRule {
  static get ruleName() {
    return 'example';
  }

  validators() {
    return {
      value: (node, ctx) => {
        if (node.value && node.externalValue) {
          return createErrorMutuallyExclusiveFields(['value', 'externalValue'], node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
        return null;
      },
      externalValue: (node, ctx) => {
        if (node.externalValue && typeof node.externalValue !== 'string') {
          return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
        if (node.value && node.externalValue) {
          return createErrorMutuallyExclusiveFields(['value', 'externalValue'], node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
        return null;
      },
      description: (node, ctx) => {
        if (node.description && typeof node.description !== 'string') {
          return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
        return null;
      },
      summary: (node, ctx) => {
        if (node.summary && typeof node.summary !== 'string') {
          return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
        return null;
      },
    };
  }

  OpenAPIExample() {
    return {
      onEnter: (node, definition, ctx) => {
        const result = [];
        const validators = this.validators();
        const vals = Object.keys(validators);
        for (let i = 0; i < vals.length; i += 1) {
          if (isRuleEnabled(this, vals[i])) {
            ctx.path.push(vals[i]);
            const res = validators[vals[i]](node, ctx, this.config);
            if (res) {
              if (Array.isArray(res)) result.push(...res);
              else result.push(res);
            }
            ctx.path.pop();
          }
        }
        return result;
      },
    };
  }
}

module.exports = ValidateOpenAPIExample;
