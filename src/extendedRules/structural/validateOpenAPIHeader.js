/* eslint-disable class-methods-use-this */
import createError, { createErrrorFieldTypeMismatch, createErrorMutuallyExclusiveFields } from '../../error';

import { isRuleEnabled } from '../utils';
import AbstractRule from '../utils/AbstractRule';

class ValidateOpenAPIHeader extends AbstractRule {
  static get ruleName() {
    return 'header';
  }

  validators() {
    return {
      description: (node, ctx) => {
        if (node && node.description && typeof node.description !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      required: (node, ctx) => {
        if (node && node.required && typeof node.required !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (node && node.in && node.in === 'path' && !(node.required || node.required !== true)) {
          return createError('If the parameter location is "path", this property is REQUIRED and its value MUST be true.', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        }
        return null;
      },
      deprecated: (node, ctx) => {
        if (node && node.deprecated && typeof node.deprecated !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      allowEmptyValue: (node, ctx) => {
        if (node && node.allowEmptyValue && typeof node.allowEmptyValue !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      explode: (node, ctx) => {
        if (node && node.explode && typeof node.explode !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      allowReserved: (node, ctx) => {
        if (node && node.allowReserved && typeof node.allowReserved !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      example: (node, ctx) => {
        if (node.example && node.examples) return createErrorMutuallyExclusiveFields(['example', 'examples'], node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      examples: (node, ctx) => {
        if (node.example && node.examples) return createErrorMutuallyExclusiveFields(['examples', 'example'], node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
    };
  }

  OpenAPIHeader() {
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

module.exports = ValidateOpenAPIHeader;
